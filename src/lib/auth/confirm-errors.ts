/**
 * Reasons a confirmation link can fail, passed from `/auth/confirm` to `/login` as
 * `?error=<key>`.
 *
 * A fixed set of keys rather than the message itself, for two reasons: Supabase's own
 * errors are written for developers ("PKCE code verifier not found in storage…"), and a
 * query parameter rendered straight onto the page would let anyone put arbitrary text on
 * our login screen by sending someone a crafted link.
 */
export const CONFIRM_ERRORS = {
  link_invalid: "That confirmation link is not valid. Try signing up again.",
  link_expired:
    "That confirmation link has expired. Sign up again to get a new one.",
  link_mismatch:
    "That link was opened in a different browser from the one you signed up in. Open it in the original browser, or sign up again.",
} as const;

export type ConfirmErrorKey = keyof typeof CONFIRM_ERRORS;

/** Resolves a `?error=` value to display text, ignoring anything we did not send. */
export function confirmErrorMessage(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return (
    CONFIRM_ERRORS[value as ConfirmErrorKey] ??
    "We could not confirm that link. Please try signing in again."
  );
}
