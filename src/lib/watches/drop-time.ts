/**
 * When will this table become bookable?
 *
 * This is the whole "magic" of FirstSeat, and it is arithmetic rather than magic: we know
 * each restaurant's release rule, so the moment a given date opens is a calculation, not a
 * guess and not something scraped from a live site.
 *
 *   rule          = { daysInAdvance, releaseTime, timezone }
 *   dropDate      = targetDate − daysInAdvance          (plain calendar arithmetic)
 *   dropDatetime  = dropDate at releaseTime, in the restaurant's timezone
 *   alertAt       = dropDatetime − DEFAULT_ALERT_LEAD_MINUTES
 *
 * Every function here is pure: same inputs, same outputs, no database, no clock, no
 * network. That is deliberate — this is the code most worth testing, and code that reads
 * `Date.now()` internally is code you cannot test.
 *
 * ── Why the timezone handling is not a one-liner ───────────────────────────
 *
 * A release time is a *wall clock* time in the restaurant's own zone: Resy opens New York
 * dates at midnight New York time, whatever that happens to be in UTC today. Twice a year
 * daylight saving moves that boundary, so "midnight in New York" is 04:00 UTC in August
 * and 05:00 UTC in January. Storing or computing it as a fixed offset would put every
 * alert an hour out for half the year — and an hour late is the same as not sending it.
 *
 * So the conversion below asks the IANA timezone database, through `Intl`, what the offset
 * actually was at that moment.
 */

import {
  addDays,
  formatCivilDate,
  isKnownTimezone,
  parseCivilDate,
  parseTimeOfDay,
  type CivilDate,
  type TimeOfDay,
} from "@/lib/time";

/**
 * How long before the drop the user is warned.
 *
 * Five minutes is a deliberate business rule, not an arbitrary constant: long enough to
 * stop what you are doing, open the link and have the party size and date already
 * selected, short enough that you are still at the screen when the window opens. It is
 * pinned by a test so changing it has to be a deliberate act.
 */
export const DEFAULT_ALERT_LEAD_MINUTES = 5;

/** The parts of a release rule that affect the calculation. */
export type ReleaseRuleInput = {
  daysInAdvance: number;
  /** Wall-clock "HH:MM" in `timezone`. */
  releaseTime: string;
  /** IANA name, e.g. "America/New_York". The *restaurant's* zone, not the user's. */
  timezone: string;
};

export type DropMoment = {
  /** The calendar date the booking window opens, in the restaurant's timezone. */
  dropDate: string;
  /** The exact instant the window opens. */
  dropDatetime: Date;
  /** When to warn the user, `alertLeadMinutes` before the drop. */
  alertAt: Date;
};

/**
 * `Intl.DateTimeFormat` is expensive to construct and gets called several times per
 * conversion, so formatters are reused per timezone.
 */
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const existing = formatters.get(timeZone);

  if (existing) {
    return existing;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    // Without this, midnight formats as hour "24" in some locales and the arithmetic
    // below silently lands a day out.
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  formatters.set(timeZone, formatter);

  return formatter;
}

/**
 * The zone's offset from UTC, in milliseconds, at one particular instant.
 *
 * There is no API that answers this directly, so we ask `Intl` to render the instant as
 * local wall-clock time in that zone, then read those numbers back as if they were UTC.
 * The difference between the two is the offset. Positive is east of Greenwich.
 */
function offsetAt(utcMs: number, timeZone: string): number {
  const parts = formatterFor(timeZone).formatToParts(new Date(utcMs));
  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);

  const wallClockAsIfUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour"),
    read("minute"),
    read("second"),
  );

  return wallClockAsIfUtc - utcMs;
}

/**
 * The instant at which the clocks in `timeZone` read `date` at `time`.
 *
 * This is a chicken-and-egg problem: to know the offset we need the instant, and to know
 * the instant we need the offset. It is solved by guessing and correcting.
 *
 *  1. Guess that the wall clock reading is UTC, and look up the offset around then.
 *  2. Apply that offset. Now check the offset at the corrected instant — on a normal day
 *     it is the same and we are done.
 *  3. If it changed, we crossed a daylight-saving boundary. Retry with the new offset.
 *  4. If that also disagrees, the wall-clock time does not exist: it fell in the hour
 *     skipped when the clocks went forward. The instant just after the gap is returned,
 *     which is what a person means when they say "02:30 on the day the clocks changed".
 *
 * A time that happens *twice* (the repeated hour when clocks go back) resolves to the
 * first occurrence, which for an alert is the safe direction — early, never late.
 */
export function zonedWallClockToInstant(
  date: CivilDate,
  time: TimeOfDay,
  timeZone: string,
): Date {
  const wallClockAsIfUtc = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    time.hour,
    time.minute,
  );

  const guessedOffset = offsetAt(wallClockAsIfUtc, timeZone);
  let instant = wallClockAsIfUtc - guessedOffset;

  const actualOffset = offsetAt(instant, timeZone);

  if (actualOffset !== guessedOffset) {
    instant = wallClockAsIfUtc - actualOffset;

    if (offsetAt(instant, timeZone) !== actualOffset) {
      instant = wallClockAsIfUtc - guessedOffset;
    }
  }

  return new Date(instant);
}

/**
 * The moment a table for `targetDate` is released, and when to alert about it.
 *
 * Throws on malformed input rather than returning something plausible. Callers get their
 * values from Zod-validated forms and from release rules the seed script already
 * validated, so reaching these is a bug in our code, not bad user input — and a wrong
 * drop time is far more damaging than a crash, because nothing about it looks wrong.
 */
export function computeDropMoment({
  targetDate,
  rule,
  alertLeadMinutes = DEFAULT_ALERT_LEAD_MINUTES,
}: {
  /** The date of the meal, "YYYY-MM-DD". */
  targetDate: string;
  rule: ReleaseRuleInput;
  alertLeadMinutes?: number;
}): DropMoment {
  const target = parseCivilDate(targetDate);

  if (!target) {
    throw new Error(`targetDate must be a real date as YYYY-MM-DD, got "${targetDate}".`);
  }

  const releaseTime = parseTimeOfDay(rule.releaseTime);

  if (!releaseTime) {
    throw new Error(`releaseTime must be "HH:MM" on a 24-hour clock, got "${rule.releaseTime}".`);
  }

  if (!Number.isInteger(rule.daysInAdvance) || rule.daysInAdvance < 0) {
    throw new Error(`daysInAdvance must be a whole number of days, got ${rule.daysInAdvance}.`);
  }

  if (!Number.isInteger(alertLeadMinutes) || alertLeadMinutes < 0) {
    throw new Error(`alertLeadMinutes must be a whole number of minutes, got ${alertLeadMinutes}.`);
  }

  if (!isKnownTimezone(rule.timezone)) {
    throw new Error(`timezone must be an IANA name like America/New_York, got "${rule.timezone}".`);
  }

  const dropDate = addDays(target, -rule.daysInAdvance);
  const dropDatetime = zonedWallClockToInstant(dropDate, releaseTime, rule.timezone);
  const alertAt = new Date(dropDatetime.getTime() - alertLeadMinutes * 60_000);

  return {
    dropDate: formatCivilDate(dropDate),
    dropDatetime,
    alertAt,
  };
}
