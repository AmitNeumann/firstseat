import { DropTimes } from "@/components/watches/drop-times";
import {
  MEAL_LABELS,
  formatCountdown,
  formatShortDate,
  formatTime,
  platformLabel,
} from "@/lib/watches/format";
import type { Meal } from "@/generated/prisma/enums";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The landing "Try it" preview, visually the same shape as a My Watches card.
 *
 * Presentational: the parent owns the ticking clock and the drop math, so this can render
 * from a Server or a Client Component.
 */
export function LandingPreviewCard({
  name,
  targetDate,
  meal,
  partySize,
  dropDatetime,
  alertAt,
  platform,
  restaurantZone,
  userZone,
  now,
}: {
  name: string;
  targetDate: string;
  meal: Meal;
  partySize: number;
  dropDatetime: Date;
  alertAt: Date;
  platform: string;
  restaurantZone: string;
  userZone: string;
  now: number;
}) {
  const remaining = dropDatetime.getTime() - now;
  const soon = remaining > 0 && remaining < DAY_MS;

  return (
    <article
      className="relative flex flex-col gap-3.5 overflow-hidden rounded-panel border
                 border-border bg-card px-[18px] py-4 shadow-card"
    >
      {soon && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: "linear-gradient(90deg, #C75C40, #E8A98C)" }}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-[22px] font-medium tracking-[-0.015em] text-espresso">
              {name}
            </h3>
            {soon ? (
              <span className="rounded-full bg-clay px-2.5 py-[3px] text-[11px] font-bold tracking-[0.04em] text-cream-on-clay">
                Opens within 24h
              </span>
            ) : (
              <span className="rounded-full bg-honey px-[9px] py-[3px] text-[11px] font-semibold text-clay-text">
                Preview
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-muted">
            {formatShortDate(targetDate)} · {MEAL_LABELS[meal]} · Party of {partySize}
          </p>
        </div>

        <p className="font-serif text-[26px] font-normal tabular-nums text-clay">
          {formatCountdown(remaining)}
        </p>
      </div>

      <DropTimes
        dropDatetime={dropDatetime}
        restaurantZone={restaurantZone}
        userZone={userZone}
      />

      <p className="text-[12.5px] text-muted">
        Opens on {platformLabel(platform)} · we&apos;d alert you at{" "}
        {formatTime(alertAt, userZone)} your time
      </p>
    </article>
  );
}
