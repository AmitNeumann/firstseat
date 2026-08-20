/**
 * Turning stored values into text a person reads.
 *
 * Instants are always rendered in an explicit timezone — usually the user's, taken from
 * their `users.timezone` row. A drop time shown without a zone is the exact bug this
 * product exists to fix, since "midnight" means two different moments to a diner in Tel
 * Aviv and the restaurant in New York.
 */

import { Meal, Platform } from "@/generated/prisma/enums";
import { parseCivilDate } from "@/lib/time";

export const MEAL_LABELS: Record<Meal, string> = {
  [Meal.BREAKFAST]: "Breakfast",
  [Meal.BRUNCH]: "Brunch",
  [Meal.LUNCH]: "Lunch",
  [Meal.DINNER]: "Dinner",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  [Platform.RESY]: "Resy",
  [Platform.TOCK]: "Tock",
  [Platform.OPENTABLE]: "OpenTable",
  [Platform.SEVENROOMS]: "SevenRooms",
  [Platform.DIRECT]: "the restaurant's own site",
  [Platform.OTHER]: "another platform",
};

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
