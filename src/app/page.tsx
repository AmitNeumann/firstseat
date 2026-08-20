import Link from "next/link";

import { getAuthUser } from "@/lib/auth/dal";

export default async function Home() {
  // Deliberately the auth user and not the app user: a public page should not trigger a
  // database write just to decide which link to show.
  const signedIn = Boolean(await getAuthUser());

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-4 py-16">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Never miss a table again
        </h1>
        <p className="text-base text-muted sm:text-lg">
          The best restaurants release their tables on a fixed schedule, and they
          are gone in seconds. Tell FirstSeat where you want to eat and it will
          alert you moments before the table becomes bookable.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {signedIn ? (
          <Link
            href="/dashboard"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground
                       transition-opacity hover:opacity-90"
          >
            Go to your watches
          </Link>
        ) : (
          <>
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground
                         transition-opacity hover:opacity-90"
            >
              Create an account
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium
                         transition-colors hover:bg-card"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
