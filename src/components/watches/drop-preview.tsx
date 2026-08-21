import { DropTimes } from "@/components/watches/drop-times";
import { PLATFORM_LABELS } from "@/lib/watches/format";
import type { RestaurantOption } from "@/lib/watches/options";
import { computeDropMoment } from "@/lib/watches/drop-time";

/**
 * When this table would open, shown while the form is still being filled in.
 *
 * `computeDropMoment` is pure and has no dependencies, so the same function the server
 * uses to schedule the alert runs here in the browser to preview it. There is one
 * implementation of the rule, tested once, and the preview cannot drift from what
 * actually gets saved.
 *
 * The preview is a courtesy, not a decision: the server recomputes everything from the
 * database when the form is submitted.
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

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-medium">If you watch this table</p>

      {moments.map(({ rule, moment }) => (
        <div key={rule.platform} className="space-y-1">
          <p className="text-xs text-muted">
            Bookings open on {PLATFORM_LABELS[rule.platform]}
          </p>
          <DropTimes
            dropDatetime={moment.dropDatetime}
            alertAt={moment.alertAt}
            restaurantZone={rule.timezone}
            userZone={userZone}
          />
        </div>
      ))}
    </div>
  );
}
