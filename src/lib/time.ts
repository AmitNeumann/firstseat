/**
 * Small time helpers shared by the seed script, the Zod schemas and the drop-time
 * calculation. Deliberately dependency-free and pure, so they are trivial to unit test.
 *
 * The distinction this file keeps straight, and which the whole product depends on:
 *
 *  • A **civil date** ("2026-09-24") and a **time of day** ("00:00") are wall-clock
 *    descriptions. On their own they do not name a moment — "midnight on the 24th" is a
 *    different instant in New York than it is in Tel Aviv.
 *  • An **instant** (a JS `Date`, a Postgres `timestamptz`) is one point on the world's
 *    timeline, the same for everybody.
 *
 * Turning the first into the second requires a timezone, and is the job of
 * `src/lib/watches/drop-time.ts`.
 */

/** A wall-clock time of day on a 24-hour clock: "00:00" through "23:59". */
export const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** A calendar date with no timezone and no time: "2026-09-24". */
export const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type TimeOfDay = {
  hour: number;
  minute: number;
};

/** `month` is 1-12, unlike the JS `Date` constructor's 0-11. */
export type CivilDate = {
  year: number;
  month: number;
  day: number;
};

/** Parses "HH:MM" into numbers, or returns `null` if it is not a valid time of day. */
export function parseTimeOfDay(value: string): TimeOfDay | null {
  const match = TIME_OF_DAY_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/**
 * Parses "YYYY-MM-DD", or returns `null`.
 *
 * The regex alone would accept "2026-02-31", so the parsed values are round-tripped
 * through `Date.UTC`, which normalises 31 February into 3 March and therefore no longer
 * matches what was asked for.
 */
export function parseCivilDate(value: string): CivilDate | null {
  const match = CIVIL_DATE_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const normalised = new Date(Date.UTC(year, month - 1, day));

  if (
    normalised.getUTCFullYear() !== year ||
    normalised.getUTCMonth() !== month - 1 ||
    normalised.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function formatCivilDate(date: CivilDate): string {
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");

  return `${date.year}-${month}-${day}`;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Calendar arithmetic, with no timezone involved: 30 days before the 24th is the 25th of
 * the month before, in every zone on earth.
 *
 * UTC is used purely as a calendar that knows how long each month is. It has no daylight
 * saving, so every day is exactly 24 hours and the subtraction cannot drift.
 */
export function addDays(date: CivilDate, days: number): CivilDate {
  const shifted = new Date(
    Date.UTC(date.year, date.month - 1, date.day) + days * MS_PER_DAY,
  );

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

const civilDateFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * What the calendar reads in `timeZone` at a given instant.
 *
 * "Is that date in the past?" has no answer without a zone: when it is 2am on the 21st in
 * Tel Aviv it is still the 20th in New York. A watch is for a table in the restaurant's
 * city, so the restaurant's zone is the one that decides.
 *
 * `en-CA` is used because it formats dates as YYYY-MM-DD, which is exactly the shape we
 * parse back.
 */
export function civilDateInZone(instant: Date, timeZone: string): CivilDate {
  let formatter = civilDateFormatters.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    civilDateFormatters.set(timeZone, formatter);
  }

  const parsed = parseCivilDate(formatter.format(instant));

  if (!parsed) {
    throw new Error(`Could not read a calendar date in timezone "${timeZone}".`);
  }

  return parsed;
}

/** Negative if `a` is earlier, zero if equal, positive if later. ISO dates sort as text. */
export function compareCivilDates(a: CivilDate, b: CivilDate): number {
  return formatCivilDate(a).localeCompare(formatCivilDate(b));
}

/**
 * `Intl` is the only IANA timezone database available at runtime without a dependency:
 * constructing a formatter with an unknown zone throws.
 */
export function isKnownTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * A place-based zone such as "America/New_York", rather than a fixed-offset alias.
 *
 * `Intl` also accepts legacy names like "EST" and "UTC". Those are real entries in the
 * timezone database, but they are frozen offsets that never observe daylight saving — so
 * a New York restaurant recorded as "EST" would have every summer drop computed an hour
 * late, which is the same as never alerting at all. Only a place-based name carries the
 * daylight-saving rules with it, so release rules are required to use one.
 */
export function isRegionTimezone(value: string): boolean {
  return value.includes("/") && isKnownTimezone(value);
}
