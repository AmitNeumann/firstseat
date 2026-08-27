import "server-only";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";

import { namesFromAuthMetadata } from "@/lib/auth/oauth-profile";
import { DEFAULT_TIMEZONE } from "@/lib/auth/schemas";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isKnownTimezone } from "@/lib/time";

/**
 * The application's own view of a signed-in user, read from the `users` table.
 *
 * Only the columns the app actually needs are selected, so a future column (a phone
 * number, a plan) is not exposed to callers by accident.
 */
export type AppUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  timezone: string;
};

/**
 * The Supabase Auth user for this request, or `null`. The one way to ask "who is this?".
 *
 * `getUser()` verifies the JWT with Supabase instead of trusting the cookie, so this is
 * safe to base authorization on — `getSession()` would not be. `cache` memoises it for the
 * duration of one render pass, so a page and several components can each ask without
 * repeating the network call.
 */
export const getAuthUser = cache(async (): Promise<SupabaseAuthUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

/**
 * Guarantees a `users` row exists for a Supabase Auth user, and returns it.
 *
 * `users.id` has no database default precisely so that it can be set to `auth.users.id`.
 * This function is the single place that link is made, and it is idempotent: calling it on
 * every sign-in is harmless.
 */
export async function ensureAppUser(
  authUser: SupabaseAuthUser,
  extras?: { timezone?: string },
): Promise<AppUser> {
  const email = authUser.email;

  if (!email) {
    // Every sign-in method we support is email-based, so this means Supabase and this
    // code have drifted apart rather than that a user did something unusual.
    throw new Error(
      `Supabase auth user ${authUser.id} has no email address; cannot create a users row.`,
    );
  }

  const select = { id: true, email: true, firstName: true, lastName: true, timezone: true } as const;

  const existing = await prisma.user.findUnique({
    where: { id: authUser.id },
    select,
  });

  if (existing) {
    if (existing.email === email) {
      return existing;
    }

    // Supabase owns the address, and we send alerts to our copy of it, so it has to
    // follow. Writing only on an actual change keeps `updated_at` meaningful.
    return prisma.user.update({
      where: { id: authUser.id },
      data: { email },
      select,
    });
  }

  const timezone = readTimezone(authUser, extras?.timezone);
  const { firstName, lastName } = namesFromAuthMetadata(
    asMetadata(authUser.user_metadata),
  );

  // An upsert rather than a create: the first sign-in can fan out into several
  // concurrent requests, and each of them would see no row here.
  return prisma.user.upsert({
    where: { id: authUser.id },
    create: { id: authUser.id, email, timezone, firstName, lastName },
    update: {},
    select,
  });
}

/**
 * Timezone for a brand-new `users` row.
 *
 * Email signup stores the browser zone on `user_metadata` so it survives confirmation.
 * Google OAuth has no form, so the callback may pass the zone captured before the
 * redirect. Junk values fall back to the column default (`Europe/London`).
 */
function readTimezone(authUser: SupabaseAuthUser, fallback?: string): string {
  return (
    validTimezone(authUser.user_metadata?.timezone) ??
    validTimezone(fallback) ??
    DEFAULT_TIMEZONE
  );
}

function validTimezone(value: unknown): string | null {
  return typeof value === "string" && isKnownTimezone(value) ? value : null;
}

function asMetadata(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

/** The signed-in user's `users` row, or `null` when nobody is signed in. */
export const getAppUser = cache(async (): Promise<AppUser | null> => {
  const authUser = await getAuthUser();

  return authUser ? ensureAppUser(authUser) : null;
});

/**
 * The authorization gate for anything that belongs to a user.
 *
 * Prisma connects as the `postgres` role, which bypasses Row Level Security, so RLS will
 * not stop a query that forgets to scope itself. Deriving the id from here — and passing
 * it into every `where` clause — is what actually keeps one user out of another's data.
 *
 * Safe in both pages and Server Functions: `redirect()` sends a browser navigation in a
 * page and a redirect response to the client in an action.
 */
export async function requireAppUser(): Promise<AppUser> {
  const user = await getAppUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
