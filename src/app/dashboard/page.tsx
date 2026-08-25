import type { Metadata } from "next";

import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import type { DashboardWatch } from "@/components/watches/watch-card";
import { WatchList } from "@/components/watches/watch-list";
import { requireAppUser } from "@/lib/auth/dal";
import { listWatchesForUser, type UserWatch } from "@/lib/watches/queries";

export const metadata: Metadata = {
  title: "My Watches — FirstSeat",
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
    <div className="flex min-h-full flex-col">
      <SiteHeader signedIn current="watches" user={user} />

      <main
        className="mx-auto flex w-full max-w-[900px] flex-1 flex-col gap-4
                   px-[clamp(14px,4vw,28px)] pt-[clamp(22px,5vw,40px)] pb-20"
      >
        <WatchList
          watches={watches.map(toDashboardWatch)}
          timezone={user.timezone}
          firstName={user.firstName}
        />
      </main>

      <SiteFooter />
    </div>
  );
}

function toDashboardWatch(watch: UserWatch): DashboardWatch {
  return {
    id: watch.id,
    name: watch.restaurant.name,
    targetDate: watch.targetDate.toISOString().slice(0, 10),
    meal: watch.meal,
    partySize: watch.partySize,
    alerts: watch.dropAlerts.map((alert) => ({
      id: alert.id,
      platform: alert.platform,
      dropDatetime: alert.dropDatetime.toISOString(),
      alertAt: alert.alertAt.toISOString(),
      bookingUrl: alert.bookingUrl,
      restaurantZone: alert.releaseRule.timezone,
    })),
  };
}
