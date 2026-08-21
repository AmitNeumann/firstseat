import { describeInBothZones, formatTime, zonePlaceLabel } from "@/lib/watches/format";

/**
 * When a booking window opens, stated in both the restaurant's timezone and the user's.
 *
 * No hooks and no state, so the same component renders inside the Server Component watch
 * card and inside the client-side preview on the form.
 */
export function DropTimes({
  dropDatetime,
  alertAt,
  restaurantZone,
  userZone,
}: {
  dropDatetime: Date;
  /** Omitted on the form preview, where no alert has been scheduled yet. */
  alertAt?: Date;
  userZone: string;
  restaurantZone: string;
}) {
  const when = describeInBothZones(dropDatetime, restaurantZone, userZone);

  return (
    <div className="space-y-0.5 text-xs">
      <p className="text-muted">
        <span className="font-medium text-foreground">{when.restaurant}</span>
      </p>

      {!when.sameZone && (
        <p className="text-muted">
          <span aria-hidden="true">= </span>
          <span className="font-medium text-foreground">{when.user}</span>
        </p>
      )}

      {alertAt && (
        <p className="text-muted">
          We alert you at {formatTime(alertAt, userZone)}{" "}
          {when.sameZone ? `${zonePlaceLabel(userZone)} time` : "your time"}.
        </p>
      )}
    </div>
  );
}
