"use client";

import Link from "next/link";

import { useTickingNow } from "@/components/watches/use-ticking-now";
import { WatchCard, type DashboardWatch } from "@/components/watches/watch-card";
import { greetingFirstName } from "@/lib/auth/display";
import { DEFAULT_ALERT_LEAD_MINUTES } from "@/lib/watches/drop-time";
import { formatCountdown, isDropOpen } from "@/lib/watches/format";

/**
 * The signed-in home: title, live lede, cards sorted by what opens soonest.
 *
 * The page is a Server Component so `requireAppUser` and the Prisma read stay on the
 * server. This wrapper is the only Client Component — it owns the one-second clock the
 * countdowns and the "window is open" card both need.
 */
export function WatchList({
  watches,
  timezone,
  firstName,
}: {
  watches: DashboardWatch[];
  timezone: string;
  firstName: string | null;
}) {
  const now = useTickingNow(true);
  const clockReady = now > 0;
  const greeting = greetingFirstName(firstName);
  const sorted = sortBySoonestDrop(watches);
  const next = sorted.find((watch) => {
    const dropAt = watch.alerts[0] ? Date.parse(watch.alerts[0].dropDatetime) : null;
    return dropAt !== null && !isDropOpen(dropAt, now) && dropAt - now > 0;
  });
  const nextRemaining = next?.alerts[0]
    ? Date.parse(next.alerts[0].dropDatetime) - now
    : null;

  return (
    <>
      <div className="flex flex-col gap-2">
        {greeting && (
          <p className="font-serif text-[clamp(28px,5.4vw,36px)] font-normal tracking-[-0.02em] text-espresso">
            Hi {greeting}!
          </p>
        )}
        <h1 className="font-serif text-[clamp(28px,5.4vw,36px)] font-normal tracking-[-0.02em] text-espresso">
          My Watches
        </h1>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-sm text-muted">
            {clockReady && nextRemaining !== null
              ? `Sorted by what opens soonest. Next window in ${formatCountdown(nextRemaining)}.`
              : `Sorted by what opens soonest. We alert you ${DEFAULT_ALERT_LEAD_MINUTES} minutes early.`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="whitespace-nowrap rounded-lg bg-honey px-3 py-[7px] text-xs font-semibold text-clay-text">
              your time · {timezone}
            </span>
            <Link
              href="/watches/new"
              className="rounded-[9px] bg-clay px-[15px] py-[9px] text-[13.5px] font-semibold
                         text-cream-on-clay hover:bg-clay-dark"
            >
              New watch
            </Link>
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyWatches />
      ) : (
        <div className="flex flex-col gap-4">
          {sorted.map((watch) => (
            <WatchCard
              key={watch.id}
              watch={watch}
              timezone={timezone}
              now={now}
              clockReady={clockReady}
            />
          ))}
        </div>
      )}
    </>
  );
}

function EmptyWatches() {
  return (
    <div
      className="flex flex-col items-center gap-3.5 rounded-[18px] border border-honey-border
                 bg-honey-light px-6 py-11 text-center"
    >
      <p className="font-serif text-2xl font-normal text-espresso">
        Nothing on the books yet
      </p>
      <p className="max-w-[40ch] text-[13.5px] text-honey-muted">
        Add a restaurant and we&apos;ll wake up for the drop so you don&apos;t have to.
      </p>
      <Link
        href="/watches/new"
        className="mt-1 rounded-[11px] bg-clay px-[22px] py-3 text-sm font-semibold
                   text-cream-on-clay hover:bg-clay-dark"
      >
        New watch
      </Link>
    </div>
  );
}

function sortBySoonestDrop(watches: DashboardWatch[]): DashboardWatch[] {
  return [...watches].sort((a, b) => soonestDrop(a) - soonestDrop(b));
}

function soonestDrop(watch: DashboardWatch): number {
  const first = watch.alerts[0];
  return first ? Date.parse(first.dropDatetime) : Number.POSITIVE_INFINITY;
}
