import Link from "next/link";

import { DropTimes } from "@/components/watches/drop-times";
import type { Meal } from "@/generated/prisma/enums";
import { DEFAULT_ALERT_LEAD_MINUTES } from "@/lib/watches/drop-time";
import {
  MEAL_LABELS,
  formatCountdown,
  formatShortDate,
  formatTime,
  isDropOpen,
  platformLabel,
} from "@/lib/watches/format";
import { cancelWatch } from "@/lib/watches/actions";

const DAY_MS = 24 * 60 * 60 * 1000;

/** One watch, shaped for the dashboard cards. Dates are ISO strings so this can render on the client. */
export type DashboardWatch = {
  id: string;
  name: string;
  targetDate: string;
  meal: Meal;
  partySize: number;
  alerts: DashboardAlert[];
};

export type DashboardAlert = {
  id: string;
  platform: string;
  dropDatetime: string;
  alertAt: string;
  bookingUrl: string;
  restaurantZone: string;
};

/**
 * One watch, with the drop moments computed for it.
 *
 * Presentational: the parent owns the ticking clock. Cancel still posts to the same
 * Server Action — the visual state (pending vs open) is decided from the clock, not
 * from a database status the scheduler has not written yet.
 */
export function WatchCard({
  watch,
  timezone,
  now,
  clockReady = true,
}: {
  watch: DashboardWatch;
  timezone: string;
  now: number;
  clockReady?: boolean;
}) {
  const primary = watch.alerts[0];
  const dropAt = primary ? Date.parse(primary.dropDatetime) : null;
  const remaining = dropAt === null ? null : dropAt - now;
  const open = dropAt !== null && isDropOpen(dropAt, now);

  if (open && primary) {
    return <OpenWatchCard watch={watch} alert={primary} />;
  }

  const soon = remaining !== null && remaining > 0 && remaining < DAY_MS;

  return (
    <article
      className="relative flex flex-col gap-4 overflow-hidden rounded-[18px] border
                 border-border bg-card p-[clamp(16px,3vw,24px)]"
    >
      {soon && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: "linear-gradient(90deg, #C75C40, #E8A98C)" }}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h2 className="font-serif text-[clamp(22px,3.6vw,26px)] font-medium tracking-[-0.015em] text-espresso">
              {watch.name}
            </h2>
            {soon ? (
              <span className="rounded-full bg-clay px-2.5 py-[3px] text-[11px] font-bold tracking-[0.04em] text-cream-on-clay">
                Opens within 24h
              </span>
            ) : remaining !== null && remaining >= DAY_MS ? (
              <span className="rounded-full bg-honey px-[9px] py-[3px] text-[11px] font-semibold text-clay-text">
                Watching
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[13px] text-muted">{metaLine(watch)}</p>
        </div>

        {remaining !== null && (
          <p className="min-w-[120px] text-right font-serif text-[clamp(26px,4.6vw,34px)] font-normal leading-[1.1] tracking-[-0.02em] tabular-nums text-clay">
            {clockReady ? formatCountdown(remaining) : "\u00a0"}
          </p>
        )}
      </div>

      {watch.alerts.map((alert) => (
        <DropTimes
          key={alert.id}
          dropDatetime={new Date(alert.dropDatetime)}
          restaurantZone={alert.restaurantZone}
          userZone={timezone}
        />
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <p className="text-[12.5px] text-muted">
          {primary && remaining !== null && remaining <= 0 ? (
            <>
              Opens on {platformLabel(primary.platform)} ·{" "}
              <a
                href={primary.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-clay-text underline underline-offset-2"
              >
                Already open — book now
              </a>
            </>
          ) : primary ? (
            <>
              Opens on {platformLabel(primary.platform)} · we alert you at{" "}
              {formatTime(new Date(primary.alertAt), timezone)} your time
            </>
          ) : (
            <>We alert you {DEFAULT_ALERT_LEAD_MINUTES} minutes before the drop.</>
          )}
        </p>

        <WatchActions watchId={watch.id} />
      </div>
    </article>
  );
}

function OpenWatchCard({
  watch,
  alert,
}: {
  watch: DashboardWatch;
  alert: DashboardAlert;
}) {
  return (
    <article
      className="flex animate-pop-slow flex-col gap-[18px] rounded-[18px] bg-espresso
                 p-[clamp(18px,3vw,26px)] text-dark-card-body shadow-dark-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-[18px]">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apricot">
            The window is open
          </p>
          <h2 className="font-serif text-[clamp(26px,4.8vw,34px)] font-normal tracking-[-0.02em] text-cream">
            {watch.name}
          </h2>
          <p className="text-[13px] text-apricot">{metaLine(watch)}</p>
        </div>

        <p className="font-serif text-[clamp(26px,4.6vw,34px)] font-normal leading-[1.1] tracking-[0.06em] text-dark-card-body">
          OPEN
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <a
          href={alert.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-[180px] flex-1 rounded-[11px] bg-honey px-3.5 py-3.5 text-center
                     text-[14.5px] font-semibold text-espresso hover:bg-apricot"
        >
          Book on {platformLabel(alert.platform)} ↗
        </a>

        <form action={cancelWatch}>
          <input type="hidden" name="watchId" value={watch.id} />
          <button
            type="submit"
            className="rounded-[11px] border border-[rgba(244,227,193,0.3)]
                       bg-[rgba(244,227,193,0.12)] px-[18px] py-3.5 text-[13.5px]
                       font-semibold text-apricot hover:bg-[rgba(244,227,193,0.24)]"
          >
            Dismiss
          </button>
        </form>
      </div>
    </article>
  );
}

function WatchActions({ watchId }: { watchId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/watches/${watchId}/edit`}
        className="rounded-[10px] bg-honey px-[18px] py-2.5 text-[13px] font-semibold
                   text-clay-text hover:bg-apricot hover:text-[#5A2D18]"
      >
        Edit
      </Link>

      <form action={cancelWatch}>
        <input type="hidden" name="watchId" value={watchId} />
        <button
          type="submit"
          className="rounded-[10px] border border-honey-border bg-cream px-[18px] py-2.5
                     text-[13px] font-semibold text-muted hover:bg-warm-cream hover:text-soft"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}

function metaLine(watch: DashboardWatch): string {
  return `${formatShortDate(watch.targetDate)} · ${MEAL_LABELS[watch.meal]} · Party of ${watch.partySize}`;
}
