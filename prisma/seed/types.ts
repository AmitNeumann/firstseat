/**
 * The shape of the hand-researched restaurant data, and the sentinel that marks a value
 * nobody has looked up yet.
 *
 * The point of `TODO` is that a missing release rule must be *visible* rather than
 * plausible. A guessed `daysInAdvance` looks exactly like a real one once it is in the
 * database, and every drop alert computed from it would be silently wrong. So an unknown
 * value is written as `TODO`, the seed runner refuses to insert it, and it is reported.
 */

export const TODO = "TODO" as const;
export type Todo = typeof TODO;

/** A field that still needs a real value looked up on the booking platform. */
export type Researched<T> = T | Todo;

export type ReleaseRuleSeed = {
  /**
   * Which platform the restaurant releases tables on — any platform, written however
   * reads naturally: "Resy", "SevenRooms", "DoorDash", "Table Check". It is normalised to
   * a lowercase slug ("sevenrooms", "table-check") before being stored, so capitalisation
   * does not matter and the same platform cannot end up recorded three ways.
   *
   * Use "Direct" for the restaurant's own site, or "Other" if nothing else fits.
   */
  platform: Researched<string>;

  /**
   * How many days before the meal the booking window opens. On Resy this is usually
   * shown as "Reservations open 30 days in advance"; on Tock it is the booking calendar's
   * last selectable date minus today.
   */
  daysInAdvance: Researched<number>;

  /**
   * The wall-clock time the window opens, 24-hour "HH:MM", in the restaurant's own
   * timezone. Midnight is written "00:00", 9am is "09:00".
   */
  releaseTime: Researched<string>;

  /**
   * IANA timezone of the restaurant, NOT of the user. Every restaurant here is in New
   * York, so this is pre-filled: it is a geographic fact, not something to research.
   */
  timezone: string;

  /** The page a user should land on to book. Must be https and match `platform`. */
  bookingUrl: Researched<string>;
};

export type RestaurantSeed = {
  name: string;
  city: string;
  /**
   * App path to a file in `public/restaurants/`, e.g. `/restaurants/minetta-tavern.jpg`.
   * Optional: the catalog card falls back to the striped placeholder when this is absent
   * or the file is missing.
   */
  imageUrl?: string;
  releaseRule: ReleaseRuleSeed;

  /**
   * Where the rule above came from and when it was checked, e.g.
   * "resy.com/cities/ny/minetta-tavern booking calendar, checked 2026-08-20".
   *
   * This is what stops fabricated data reaching the database. A rule is written with
   * `verified: true` only because a human recorded where they saw it; without a source
   * the entry is skipped like any other unfilled field.
   */
  source: Researched<string>;
};

/** True when a field has not been researched yet. */
export function isTodo(value: unknown): value is Todo {
  return value === TODO;
}

/** Every field on an entry that is still `TODO`, as dotted paths for the report. */
export function missingFields(entry: RestaurantSeed): string[] {
  const missing: string[] = [];

  if (isTodo(entry.source)) missing.push("source");

  for (const [key, value] of Object.entries(entry.releaseRule)) {
    if (isTodo(value)) missing.push(`releaseRule.${key}`);
  }

  return missing;
}
