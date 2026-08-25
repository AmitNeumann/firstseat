/**
 * Turning stored values into text a person reads.
 *
 * Instants are always rendered in an explicit timezone — usually the user's, taken from
 * their `users.timezone` row. A drop time shown without a zone is the exact bug this
 * product exists to fix, since "midnight" means two different moments to a diner in Tel
 * Aviv and the restaurant in New York.
 */

import { Meal } from "@/generated/prisma/enums";
import { parseCivilDate } from "@/lib/time";

export const MEAL_LABELS: Record<Meal, string> = {
  [Meal.BREAKFAST]: "Breakfast",
  [Meal.BRUNCH]: "Brunch",
  [Meal.LUNCH]: "Lunch",
  [Meal.DINNER]: "Dinner",
};

// Platform labels are not a fixed map: any platform can be recorded, so the label is
// looked up in `@/lib/watches/platforms` and humanised when we do not recognise it.
export { platformLabel } from "@/lib/watches/platforms";

/** e.g. "Thu 24 Sep 2026, 07:00" — a moment, read on the clock in `timeZone`. */
export function formatInstant(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

/** e.g. "07:00" — just the clock reading in `timeZone`. */
export function formatTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

/** e.g. "Tue, 22 Sept 2026" — the calendar day of an instant in `timeZone`. */
export function formatLongDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(instant);
}

/** e.g. "Thu 24 Sep" — a civil date with no year, for card meta lines. */
export function formatShortDate(value: string): string {
  const civil = parseCivilDate(value);

  if (!civil) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

/**
 * How long the espresso "window is open" card stays up after the drop.
 *
 * Thirty minutes is a display rule, not a database status: the scheduler that would mark
 * an alert SENT does not exist yet, so the card decides from the clock. After this window
 * the watch returns to the pending card, with the countdown reading OPEN.
 */
export const OPEN_WINDOW_MS = 30 * 60 * 1000;

/** True while `now` is at or after the drop, but not more than 30 minutes past it. */
export function isDropOpen(dropAtMs: number, nowMs: number): boolean {
  const remaining = dropAtMs - nowMs;
  return remaining <= 0 && remaining > -OPEN_WINDOW_MS;
}

/**
 * How long until a drop, as the interface prints it.
 *
 * Days hide the seconds; under an hour the seconds become the ticking part. Zero or
 * negative is "OPEN" — the window has already released.
 */
export function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) {
    return "OPEN";
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  if (days > 0) {
    return `${days}d ${pad(hours)}h ${pad(minutes)}m`;
  }

  if (hours > 0) {
    return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  }

  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * The place inside an IANA zone name: "America/New_York" becomes "New York".
 *
 * Used to say "00:00 New York time" rather than "00:00 America/New_York", which is
 * accurate but reads like a config file. The full name is still shown for the user's own
 * zone, where being unambiguous matters more than reading well.
 */
export function zonePlaceLabel(timeZone: string): string {
  const place = timeZone.split("/").at(-1) ?? timeZone;

  return place.replaceAll("_", " ");
}

/**
 * The same instant said twice: once on the restaurant's clock, once on the user's.
 *
 * This is the product's whole reason for existing. "Bookings open at midnight" is true and
 * useless to someone in Tel Aviv, for whom that midnight is 07:00 the same morning — and
 * on a different date if the zones straddle one. Showing only one of the two is how a user
 * misses the drop, so both are always shown, each labelled with the zone it belongs to.
 */
export function describeInBothZones(
  instant: Date,
  restaurantZone: string,
  userZone: string,
): { restaurant: string; user: string; sameZone: boolean } {
  return {
    restaurant: `${formatInstant(instant, restaurantZone)} ${zonePlaceLabel(restaurantZone)} time`,
    user: `${formatInstant(instant, userZone)} your time (${userZone})`,
    // Nothing is gained by printing the same line twice when the diner lives in the
    // restaurant's city.
    sameZone: restaurantZone === userZone,
  };
}

/** e.g. "Thu 24 Sep 2026" — a calendar date with no time and no zone. */
export function formatDate(value: string | Date): string {
  const iso = typeof value === "string" ? value : value.toISOString().slice(0, 10);
  const civil = parseCivilDate(iso);

  if (!civil) {
    return iso;
  }

  return new Intl.DateTimeFormat("en-GB", {
    // A `date` column has no zone. Reading it back in UTC — the same zone Prisma used to
    // write it — is what stops it drifting a day for a user west of Greenwich.
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00.000Z`));
}
