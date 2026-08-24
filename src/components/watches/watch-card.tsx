import Link from "next/link";

import { DropTimes } from "@/components/watches/drop-times";
import { DropAlertStatus } from "@/generated/prisma/enums";
import { DEFAULT_ALERT_LEAD_MINUTES } from "@/lib/watches/drop-time";
import { MEAL_LABELS, formatDate, formatTime, platformLabel } from "@/lib/watches/format";
import { cancelWatch } from "@/lib/watches/actions";
import type { UserWatch } from "@/lib/watches/queries";

/**
 * One watch, with the drop moments computed for it.
 *
 * A Server Component: it renders on the server, so the only JavaScript this sends to the
 * browser is what React needs for the cancel form. There is no client state here — the
 * page is re-rendered by `revalidatePath` after an action instead.
 */
export function WatchCard({ watch, timezone }: { watch: UserWatch; timezone: string }) {
  return (
    <article className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-semibold tracking-tight">{watch.restaurant.name}</h3>
          <p className="text-sm text-muted">
            {formatDate(watch.targetDate)} · {MEAL_LABELS[watch.meal]} ·{" "}
            {watch.partySize === 1 ? "1 person" : `${watch.partySize} people`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/watches/${watch.id}/edit`}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium
                       transition-colors hover:border-accent hover:text-accent"
          >
            Edit
          </Link>

          <form action={cancelWatch}>
            <input type="hidden" name="watchId" value={watch.id} />
            <button
              type="submit"
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium
                         transition-colors hover:border-danger hover:text-danger"
            >
              Cancel
            </button>
          </form>
        </div>
      </header>

      <ul className="space-y-3 border-t border-border pt-4">
        {watch.dropAlerts.map((alert) => (
          <li key={alert.id} className="space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">
                Opens on {platformLabel(alert.platform)}
              </p>

              {alert.status !== DropAlertStatus.SCHEDULED && (
                <a
                  href={alert.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium underline underline-offset-2"
                >
                  Already open — book now
                </a>
              )}
            </div>

            <DropTimes
              dropDatetime={alert.dropDatetime}
              restaurantZone={alert.releaseRule.timezone}
              userZone={timezone}
            />

            {alert.status === DropAlertStatus.SCHEDULED && (
              <p className="text-[12.5px] text-muted">
                We alert you {DEFAULT_ALERT_LEAD_MINUTES} minutes before, at{" "}
                {formatTime(alert.alertAt, timezone)} your time.
              </p>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}
