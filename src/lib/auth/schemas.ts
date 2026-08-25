import * as z from "zod";

import { isKnownTimezone } from "@/lib/time";

/** Matches the `users.timezone` column default in `prisma/schema.prisma`. */
export const DEFAULT_TIMEZONE = "Europe/London";

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address." }));

const timezoneField = z
  .string()
  .trim()
  .refine(isKnownTimezone, { error: "Unrecognised timezone." })
  // The signup form fills this in from the browser. An empty value means JavaScript did
  // not run, so fall back to the column default rather than rejecting the signup.
  .or(z.literal("").transform(() => DEFAULT_TIMEZONE))
  .default(DEFAULT_TIMEZONE);

export const SignupSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(8, { error: "Use at least 8 characters." })
    // Supabase hashes passwords with bcrypt, which silently ignores anything past 72
    // bytes. Rejecting here avoids a password that is longer than the part that is
    // actually checked at sign-in.
    .max(72, { error: "Use 72 characters or fewer." }),
  timezone: timezoneField,
});

/**
 * Login deliberately does not reuse the signup password rules. Tightening those rules
 * later must not lock out accounts created under the old ones — the stored hash is the
 * only thing that decides whether a login succeeds.
 */
export const LoginSchema = z.object({
  email: emailField,
  password: z.string().min(1, { error: "Enter your password." }),
});

/** Settings: the zone used for "your time" on My Watches. */
export const UpdateTimezoneSchema = z.object({
  timezone: z
    .string()
    .trim()
    .refine(isKnownTimezone, { error: "Unrecognised timezone." }),
});

const optionalName = z
  .string()
  .trim()
  .max(40, { error: "Use 40 characters or fewer." })
  .transform((value) => (value.length === 0 ? null : value));

export const UpdateNameSchema = z.object({
  firstName: optionalName,
  lastName: optionalName,
});

export type SettingsFormState =
  | {
      errors?: {
        timezone?: string[];
        firstName?: string[];
        lastName?: string[];
      };
      message?: string;
      notice?: string;
    }
  | undefined;

export type AuthFormState =
  | {
      /** Per-field validation messages, keyed by input `name`. */
      errors?: {
        email?: string[];
        password?: string[];
        timezone?: string[];
      };
      /** A whole-form failure, e.g. rejected credentials. */
      message?: string;
      /** A whole-form success that does not navigate, e.g. "check your email". */
      notice?: string;
      /** Echoed back so a failed submit does not clear what the user typed. */
      email?: string;
    }
  | undefined;
