"use server";

import { redirect } from "next/navigation";
import * as z from "zod";

import { ensureAppUser } from "@/lib/auth/dal";
import {
  LoginSchema,
  SignupSchema,
  type AuthFormState,
} from "@/lib/auth/schemas";
import { field } from "@/lib/form-data";
import { getSiteOrigin } from "@/lib/site-origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signup(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const submittedEmail = field(formData, "email") ?? "";

  const parsed = SignupSchema.safeParse({
    email: field(formData, "email"),
    password: field(formData, "password"),
    timezone: field(formData, "timezone"),
  });

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      email: submittedEmail,
    };
  }

  const { email, password, timezone } = parsed.data;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read back by `ensureAppUser` when the `users` row is created, which may not be
      // until the confirmation link is followed.
      data: { timezone },
      emailRedirectTo: `${await getSiteOrigin()}/auth/confirm`,
    },
  });

  if (error) {
    return { message: error.message, email };
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

export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // Revokes the refresh token at Supabase as well as clearing the cookies, so the session
  // cannot be resumed from a copy of them.
  await supabase.auth.signOut();

  redirect("/login");
}
