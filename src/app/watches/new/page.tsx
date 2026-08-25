import type { Metadata } from "next";
import Link from "next/link";

import { CreateWatchForm } from "@/components/watches/create-watch-form";
import { requireAppUser } from "@/lib/auth/dal";
import { addDays, civilDateInZone, formatCivilDate } from "@/lib/time";
import { listRestaurantOptions } from "@/lib/watches/queries";
import { MAX_DAYS_AHEAD } from "@/lib/watches/schemas";

export const metadata: Metadata = {
  title: "New watch — FirstSeat",
};

/** Postgres rejects a malformed uuid outright, so it is filtered before use. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewWatchPage({
  searchParams,
}: {
  searchParams: Promise<{ restaurantId?: string }>;
}) {
  const user = await requireAppUser();
  const restaurants = await listRestaurantOptions();
  const { restaurantId } = await searchParams;
  const initialRestaurantId =
    restaurantId &&
    UUID_PATTERN.test(restaurantId) &&
    restaurants.some((restaurant) => restaurant.id === restaurantId)
      ? restaurantId
      : undefined;

  // The picker's bounds are shown in the user's own zone, which is the calendar they are
  // looking at. The server re-checks against the restaurant's zone, which is the one that
  // actually decides whether a date has passed.
  const today = civilDateInZone(new Date(), user.timezone);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="space-y-1">
        <Link
          href="/dashboard"
          className="text-sm text-muted transition-opacity hover:opacity-70"
        >
          ← Your watches
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Watch a table</h1>
        <p className="text-sm text-muted">
          Tell us the table you want. We know when each restaurant releases its bookings,
          so we can tell you the exact moment to be ready.
        </p>
      </header>

      {restaurants.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted">
            No restaurants yet. Release rules are entered by hand in{" "}
            <code className="font-mono text-xs">prisma/seed/nyc-restaurants.ts</code> and
            loaded with <code className="font-mono text-xs">npm run db:seed</code>.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-6">
          <CreateWatchForm
            restaurants={restaurants}
            earliestDate={formatCivilDate(today)}
            latestDate={formatCivilDate(addDays(today, MAX_DAYS_AHEAD))}
            timezone={user.timezone}
            initialRestaurantId={initialRestaurantId}
          />
        </section>
      )}
    </main>
  );
}
