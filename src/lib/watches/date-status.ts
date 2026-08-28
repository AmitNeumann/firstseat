import {
  civilDateInZone,
  compareCivilDates,
  parseCivilDate,
} from "@/lib/time";

/** Shown when the dining day itself is over, not merely when its booking window opened. */
export const PAST_DINING_DATE_MESSAGE =
  "That date has already passed. Please pick a future date.";

/**
 * Preview copy when the dining day is still upcoming (or today) but every release
 * window for it has already opened. The server action uses a more specific sentence
 * with the restaurant name and the actual open time.
 */
export const BOOKING_WINDOW_OPENED_PREVIEW_MESSAGE =
  "Bookings for this date have already opened, so a watch would not help. Pick a later date, or book it directly.";

/**
 * Whether `targetDate` is a calendar day before "today" in `timeZone`.
 *
 * A table on the 24th means the 24th in the restaurant's city, so that zone decides
 * whether the date has passed — the same rule `planAlerts` uses on the server.
 */
export function diningDateIsPast(
  targetDate: string,
  now: Date,
  timeZone: string,
): boolean {
  const target = parseCivilDate(targetDate);

  if (!target) {
    return false;
  }

  return compareCivilDates(target, civilDateInZone(now, timeZone)) < 0;
}
