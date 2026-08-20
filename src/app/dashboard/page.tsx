import type { Metadata } from "next";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { WatchCard } from "@/components/watches/watch-card";
import { requireAppUser } from "@/lib/auth/dal";
import { listWatchesForUser } from "@/lib/watches/queries";

export const metadata: Metadata = {
  title: "Your watches — FirstSeat",
};

export default async function DashboardPage() {
  // The authorization check. It runs here, next to the data, rather than in a layout:
  // layouts do not re-render on every navigation and do not control whether the rest of
  // the route renders.
  const user = await requireAppUser();

  // Scoped to this user's id, taken from the session rather than from anything the
  // browser sent. Prisma bypasses Row Level Security, so this `where` is the only thing
  // keeping one account out of another's watches.
  const watches = await listWatchesForUser(user.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight transition-opacity hover:opacity-70"
          >
            FirstSeat
          </Link>
          <p className="text-sm text-muted">{user.email}</p>
        </div>

        <SignOutButton />
      </header>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Your watches</h1>

          <Link
            href="/watches/new"
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground
                       transition-opacity hover:opacity-90"
          >
            New watch
          </Link>
        </div>

        {watches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted">
              No watches yet. Once you add one, FirstSeat will work out the exact
              moment that table is released and alert you just before it happens.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {watches.map((watch) => (
              <WatchCard key={watch.id} watch={watch} timezone={user.timezone} />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-auto border-t border-border pt-4 text-xs text-muted">
        Times are shown in{" "}
        <span className="font-medium text-foreground">{user.timezone}</span>.
      </footer>
    </main>
  );
}
