"use client";

import { FormAlert } from "@/components/forms/fields";
import { DropTimes } from "@/components/watches/drop-times";
import { useTickingNow } from "@/components/watches/use-ticking-now";
import { computeDropMoment, DEFAULT_ALERT_LEAD_MINUTES } from "@/lib/watches/drop-time";
import { formatTime, platformLabel } from "@/lib/watches/format";
import type { RestaurantOption } from "@/lib/watches/options";

/**
 * When this table would open, shown while the form is still being filled in.
 *
 * `computeDropMoment` is pure and has no dependencies, so the same function the server
 * uses to schedule the alert runs here in the browser to preview it. There is one
 * implementation of the rule, tested once, and the preview cannot drift from what
 * actually gets saved.
 *
 * The preview is a courtesy, not a decision: the server recomputes everything from the
 * database when the form is submitted. If every window is already in the past, we say so
 * here so Create watch is not a surprise refusal.
 */
export function DropPreview({
  restaurant,
  targetDate,
  userZone,
}: {
  restaurant: RestaurantOption | null;
  targetDate: string;
  userZone: string;
}) {
  const now = useTickingNow(true);
  const clockReady = now > 0;

  if (!restaurant || !targetDate) {
    return null;
  }

  const moments = restaurant.rules.flatMap((rule) => {
    try {
      return [{ rule, moment: computeDropMoment({ targetDate, rule }) }];
    } catch {
      // A half-typed date is not worth an error message; the field's own validation and
      // the server both have something to say about it already.
      return [];
    }
  });

  if (moments.length === 0) {
    return null;
  }

  const allPast =
    clockReady && moments.every(({ moment }) => moment.dropDatetime.getTime() <= now);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-medium">If you watch this table</p>

      {allPast && (
        <FormAlert tone="error">
          Bookings for this date have already opened, so a watch would not help. Pick a
          later date, or book it directly.
        </FormAlert>
      )}

      {moments.map(({ rule, moment }) => (
        <div key={rule.platform} className="space-y-1">
          <p className="text-xs text-muted">
            Bookings open on {platformLabel(rule.platform)}
          </p>
          <DropTimes
            dropDatetime={moment.dropDatetime}
            restaurantZone={rule.timezone}
            userZone={userZone}
          />
          <p className="text-[12.5px] text-muted">
            We alert you {DEFAULT_ALERT_LEAD_MINUTES} minutes before, at{" "}
            {formatTime(moment.alertAt, userZone)} your time.
          </p>
        </div>
      ))}
    </div>
  );
}
