import { DropTimes } from "@/components/watches/drop-times";
import {
  MEAL_LABELS,
  formatCountdown,
  formatDate,
  formatTime,
  isDropOpen,
  platformLabel,
} from "@/lib/watches/format";
import type { Meal } from "@/generated/prisma/enums";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The landing "Try it" preview, visually the same shape as a My Watches card.
 *
 * Presentational: the parent owns the ticking clock and the drop math, so this can render
 * from a Server or a Client Component. No Edit/Delete — signed-out visitors cannot write
 * a watch from here.
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
  const open = isDropOpen(dropDatetime.getTime(), now);
  const meta = `${formatDate(targetDate)} · ${MEAL_LABELS[meal]} · Party of ${partySize}`;

  if (open) {
    return (
      <article
        className="flex flex-col gap-[18px] rounded-[18px] bg-espresso
                   p-[clamp(18px,3vw,26px)] text-left text-dark-card-body shadow-dark-card"
      >
        <div className="flex flex-wrap items-start justify-between gap-[18px]">
          <div className="min-w-0 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-apricot">
              The window is open
            </p>
            <h3 className="font-serif text-[clamp(26px,4.8vw,34px)] font-normal tracking-[-0.02em] text-cream">
              {name}
            </h3>
            <p className="text-[13px] text-apricot">{meta}</p>
          </div>
          <p className="font-serif text-[clamp(26px,4.6vw,34px)] font-normal leading-[1.1] tracking-[0.06em] text-dark-card-body">
            OPEN
          </p>
        </div>
      </article>
    );
  }

  const soon = remaining > 0 && remaining < DAY_MS;

  return (
    <article
      className="relative flex flex-col gap-4 overflow-hidden rounded-[18px] border
                 border-border bg-card p-[clamp(16px,3vw,24px)] text-left shadow-card"
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
            <h3 className="font-serif text-[clamp(22px,3.6vw,26px)] font-medium tracking-[-0.015em] text-espresso">
              {name}
            </h3>
            {soon ? (
              <span className="rounded-full bg-clay px-2.5 py-[3px] text-[11px] font-bold tracking-[0.04em] text-cream-on-clay">
                Opens within 24h
              </span>
            ) : remaining >= DAY_MS ? (
              <span className="rounded-full bg-honey px-[9px] py-[3px] text-[11px] font-semibold text-clay-text">
                Watching
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[13px] text-muted">{meta}</p>
        </div>

        <p className="min-w-[120px] text-right font-serif text-[clamp(26px,4.6vw,34px)] font-normal leading-[1.1] tracking-[-0.02em] tabular-nums text-clay">
          {formatCountdown(remaining)}
        </p>
      </div>

      <DropTimes
        dropDatetime={dropDatetime}
        restaurantZone={restaurantZone}
        userZone={userZone}
      />

      <p className="text-[12.5px] text-muted">
        {remaining <= 0 ? (
          <>Opens on {platformLabel(platform)}</>
        ) : (
          <>
            Opens on {platformLabel(platform)} · we&apos;d alert you at{" "}
            {formatTime(alertAt, userZone)} your time
          </>
        )}
      </p>
    </article>
  );
}
