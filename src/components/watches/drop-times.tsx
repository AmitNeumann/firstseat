import { formatLongDate, formatTime, zonePlaceLabel } from "@/lib/watches/format";

/**
 * When a booking window opens, stated in both the restaurant's timezone and the user's.
 *
 * No hooks and no state, so the same component renders inside the Server Component watch
 * card and inside the client-side preview on the form. The two clocks are the product:
 * showing only one of them is how a diner in another zone turns up on the wrong day.
 */
export function DropTimes({
  dropDatetime,
  restaurantZone,
  userZone,
}: {
  dropDatetime: Date;
  userZone: string;
  restaurantZone: string;
}) {
  const sameZone = restaurantZone === userZone;
  const restaurantPlace = zonePlaceLabel(restaurantZone);
  const userPlace = zonePlaceLabel(userZone);

  return (
    <div className="grid grid-cols-1 gap-3 rounded-[14px] border border-honey-border bg-honey-light px-4 py-3.5 sm:grid-cols-[1fr_auto_1fr] sm:gap-0">
      <div className="min-w-0">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-honey-label">
          {restaurantPlace} time
        </p>
        <p className="mt-1 font-serif text-[19px] font-medium tabular-nums text-espresso">
          {formatTime(dropDatetime, restaurantZone)}
        </p>
        <p className="mt-0.5 text-[12.5px] text-honey-muted">
          {formatLongDate(dropDatetime, restaurantZone)}
        </p>
      </div>

      {!sameZone && (
        <>
          <div
            aria-hidden="true"
            className="hidden w-px bg-honey-divider sm:mx-4 sm:block"
          />
          <div className="min-w-0 border-t border-honey-divider pt-3 sm:border-t-0 sm:pt-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-clay">
              {userPlace} time
            </p>
            <p className="mt-1 font-serif text-[19px] font-medium tabular-nums text-clay-dark">
              {formatTime(dropDatetime, userZone)}
            </p>
            <p className="mt-0.5 text-[12.5px] text-honey-muted">
              {formatLongDate(dropDatetime, userZone)}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
