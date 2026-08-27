"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as z from "zod";

import { ensureAppUser, requireAppUser } from "@/lib/auth/dal";
import { OAUTH_TZ_COOKIE } from "@/lib/auth/oauth-timezone";
import {
  DEFAULT_TIMEZONE,
  ForgotPasswordSchema,
  LoginSchema,
  ResetPasswordSchema,
  SignupSchema,
  UpdateSettingsSchema,
  type AuthFormState,
  type SettingsFormState,
} from "@/lib/auth/schemas";
import { field } from "@/lib/form-data";
import { prisma } from "@/lib/prisma";
import { getSiteOrigin } from "@/lib/site-origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isKnownTimezone } from "@/lib/time";

export async function signup(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const submittedEmail = field(formData, "email") ?? "";
  const submittedFirstName = field(formData, "firstName") ?? "";
  const submittedLastName = field(formData, "lastName") ?? "";

  const parsed = SignupSchema.safeParse({
    email: field(formData, "email"),
    password: field(formData, "password"),
    timezone: field(formData, "timezone"),
    firstName: submittedFirstName,
    lastName: submittedLastName,
  });

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      email: submittedEmail,
      firstName: submittedFirstName,
      lastName: submittedLastName,
    };
  }

  const { email, password, timezone, firstName, lastName } = parsed.data;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read back by `ensureAppUser` when the `users` row is created, which may not be
      // until the confirmation link is followed.
      data: { timezone, firstName, lastName },
      emailRedirectTo: `${await getSiteOrigin()}/auth/confirm`,
    },
  });

  if (error) {
    return {
      message: error.message,
      email,
      firstName: submittedFirstName,
      lastName: submittedLastName,
    };
  }

  if (data.session && data.user) {
    // Email confirmation is disabled on the Supabase project, so signing up also signs
    // the user in. This is their first sign-in: create the `users` row now.
    await ensureAppUser(data.user);
    redirect("/dashboard");
  }

  // Confirmation is required. Supabase answers identically for an address that is already
  // registered, which is what stops this form being used to discover who has an account —
  // so this message must stay the same either way.
  return {
    notice: `Almost there. Open the confirmation link we sent to ${email} to finish signing up.`,
  };
}

export async function login(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const submittedEmail = field(formData, "email") ?? "";

  const parsed = LoginSchema.safeParse({
    email: field(formData, "email"),
    password: field(formData, "password"),
  });

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      email: submittedEmail,
    };
  }

  const { email, password } = parsed.data;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Surfaced separately because the generic message below would leave someone who has
    // simply not opened the confirmation email with no idea what to do. It reveals that
    // the address is registered, but only to a caller who already has the password.
    if (error.code === "email_not_confirmed") {
      return {
        message:
          "Confirm your email address first — open the link we sent you when you signed up.",
        email,
      };
    }

    // Otherwise deliberately vague. Saying which of the two was wrong would turn this
    // form into a way to test whether a given email address has an account.
    return { message: "Incorrect email or password.", email };
  }

  // Idempotent, so it covers both a first sign-in that skipped confirmation and every
  // sign-in after that.
  await ensureAppUser(data.user);

  redirect("/dashboard");
}

/**
 * Starts Google OAuth. The browser timezone is stored in a short-lived cookie so
 * `/auth/callback` can apply it when creating the first `users` row — the same default
 * email signup would have used. Names come from Google via `ensureAppUser`.
 */
export async function signInWithGoogle(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const submitted = field(formData, "timezone") ?? "";
  const timezone = isKnownTimezone(submitted) ? submitted : DEFAULT_TIMEZONE;

  const cookieStore = await cookies();
  cookieStore.set(OAUTH_TZ_COOKIE, timezone, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
    secure: process.env.NODE_ENV === "production",
  });

  const supabase = await createSupabaseServerClient();
  const origin = await getSiteOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    console.error("[auth] Google OAuth could not start:", error);
    return {
      message: "Google sign-in is unavailable right now. Use email instead.",
    };
  }

  redirect(data.url);
}

/**
 * Sends a password-reset email. The message is the same whether the address has an
 * account, so this form cannot be used to discover who is registered.
 */
export async function requestPasswordReset(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const submittedEmail = field(formData, "email") ?? "";

  const parsed = ForgotPasswordSchema.safeParse({
    email: field(formData, "email"),
  });

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      email: submittedEmail,
    };
  }

  const { email } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const origin = await getSiteOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  if (error) {
    console.error("[auth] resetPasswordForEmail failed:", error);

    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return {
        message: "Please wait a moment and try again.",
        email,
      };
    }
  }

  return {
    notice: "Check your email for a reset link.",
  };
}

/**
 * Writes a new password for the recovery session established by `/auth/confirm`.
 * The diner is already signed in after exchanging the link, so they land on My Watches.
 */
export async function updatePassword(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = ResetPasswordSchema.safeParse({
    password: field(formData, "password"),
    confirmPassword: field(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "That reset link has expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    console.error("[auth] updateUser password failed:", error);
    return {
      message: "We could not update that password. Try the reset link again.",
    };
  }

  await ensureAppUser(user);
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // Revokes the refresh token at Supabase as well as clearing the cookies, so the session
  // cannot be resumed from a copy of them.
  await supabase.auth.signOut();

  redirect("/login");
}

/**
 * Saves name and timezone together from the single Settings card. Scoped by `user.id`.
 */
export async function updateSettings(
  _previousState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await requireAppUser();

  const parsed = UpdateSettingsSchema.safeParse({
    firstName: field(formData, "firstName") ?? "",
    lastName: field(formData, "lastName") ?? "",
    timezone: field(formData, "timezone"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      timezone: parsed.data.timezone,
    },
  });

  redirect("/settings?saved=1");
}
