import { logout } from "@/lib/auth/actions";

/**
 * A form rather than an onClick handler, so signing out is a POST. A link or GET would be
 * followed by anything that prefetches URLs, which would sign people out unprompted.
 */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={
          className ??
          "rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-background"
        }
      >
        Sign out
      </button>
    </form>
  );
}
