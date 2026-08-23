/**
 * Tests for the drop-time calculation.
 *
 * This is the highest-value test file in the project. Everything the product does hangs
 * off `computeDropMoment` being right, and "wrong by one hour" is a failure mode that
 * produces perfectly normal-looking data and a missed reservation. It is also pure, so it
 * can be tested exhaustively with no database and no mocking.
 *
 * Instants are asserted as ISO strings in UTC, which is unambiguous and readable.
 */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_ALERT_LEAD_MINUTES,
  computeDropMoment,
  zonedWallClockToInstant,
} from "@/lib/watches/drop-time";

/** Resy-style: New York dates open at midnight New York time, 30 days ahead. */
const NY_MIDNIGHT_30 = {
  daysInAdvance: 30,
  releaseTime: "00:00",
  timezone: "America/New_York",
};

describe("computeDropMoment", () => {
  it("works the example from the product spec", () => {
    // A table on 24 September, released 30 days earlier at midnight New York time.
    // 24 Sep − 30 days = 25 Aug. New York is on daylight time (UTC−4) in August, so
    // midnight there is 04:00 UTC — which is 07:00 in Israel, the point of the product.
    const moment = computeDropMoment({
      targetDate: "2026-09-24",
      rule: NY_MIDNIGHT_30,
    });

    expect(moment.dropDate).toBe("2026-08-25");
    expect(moment.dropDatetime.toISOString()).toBe("2026-08-25T04:00:00.000Z");
    expect(moment.alertAt.toISOString()).toBe("2026-08-25T03:55:00.000Z");
  });

  it("alerts the configured number of minutes before the drop", () => {
    const moment = computeDropMoment({
      targetDate: "2026-09-24",
      rule: NY_MIDNIGHT_30,
      alertLeadMinutes: 90,
    });

    expect(moment.dropDatetime.getTime() - moment.alertAt.getTime()).toBe(90 * 60_000);
  });

  it("warns five minutes ahead by default", () => {
    // Pinned deliberately. Five minutes is a product decision — long enough to get to the
    // screen and be ready, short enough that you are still there when the window opens —
    // so changing it should break a test rather than pass unnoticed.
    expect(DEFAULT_ALERT_LEAD_MINUTES).toBe(5);

    const moment = computeDropMoment({ targetDate: "2026-09-24", rule: NY_MIDNIGHT_30 });

    expect(moment.dropDatetime.getTime() - moment.alertAt.getTime()).toBe(5 * 60_000);
  });

  describe("daylight saving", () => {
    // The reason this module exists. New York is UTC−4 in summer and UTC−5 in winter, so
    // the same wall-clock release time is a different UTC instant depending on the date.
    // A fixed offset would put half the year's alerts an hour out.

    it("uses the summer offset for a drop date on daylight time", () => {
      const moment = computeDropMoment({
        targetDate: "2026-08-24",
        rule: { ...NY_MIDNIGHT_30, releaseTime: "09:00" },
      });

      // 25 July, 09:00 EDT = 13:00 UTC.
      expect(moment.dropDatetime.toISOString()).toBe("2026-07-25T13:00:00.000Z");
    });

    it("uses the winter offset for a drop date on standard time", () => {
      const moment = computeDropMoment({
        targetDate: "2026-02-14",
        rule: { ...NY_MIDNIGHT_30, releaseTime: "09:00" },
      });

      // 15 January, 09:00 EST = 14:00 UTC. One hour later in UTC than the summer case,
      // for exactly the same wall-clock release time.
      expect(moment.dropDatetime.toISOString()).toBe("2026-01-15T14:00:00.000Z");
    });

    it("computes across the spring transition when target and drop sit on opposite sides", () => {
      // Clocks go forward on 8 March 2026 in New York. A meal on 1 April is released
      // 30 days earlier, on 2 March — still standard time, even though the meal is not.
      const moment = computeDropMoment({
        targetDate: "2026-04-01",
        rule: { ...NY_MIDNIGHT_30, releaseTime: "10:00" },
      });

      expect(moment.dropDate).toBe("2026-03-02");
      expect(moment.dropDatetime.toISOString()).toBe("2026-03-02T15:00:00.000Z");
    });
  });

  describe("calendar arithmetic", () => {
    it("crosses a month boundary", () => {
      const moment = computeDropMoment({
        targetDate: "2026-09-24",
        rule: { ...NY_MIDNIGHT_30, daysInAdvance: 30 },
      });

      expect(moment.dropDate).toBe("2026-08-25");
    });

    it("crosses a year boundary", () => {
      const moment = computeDropMoment({
        targetDate: "2027-01-10",
        rule: { ...NY_MIDNIGHT_30, daysInAdvance: 30 },
      });

      expect(moment.dropDate).toBe("2026-12-11");
    });

    it("handles a leap day", () => {
      // 2028 is a leap year: 1 March minus 30 days must pass through 29 February.
      const moment = computeDropMoment({
        targetDate: "2028-03-01",
        rule: { ...NY_MIDNIGHT_30, daysInAdvance: 1 },
      });

      expect(moment.dropDate).toBe("2028-02-29");
    });

    it("treats zero days in advance as the target date itself", () => {
      const moment = computeDropMoment({
        targetDate: "2026-09-24",
        rule: { ...NY_MIDNIGHT_30, daysInAdvance: 0 },
      });

      expect(moment.dropDate).toBe("2026-09-24");
    });
  });

  describe("other timezones", () => {
    it("handles a restaurant in London", () => {
      const moment = computeDropMoment({
        targetDate: "2026-09-24",
        rule: { daysInAdvance: 30, releaseTime: "09:00", timezone: "Europe/London" },
      });

      // London is on BST (UTC+1) in August.
      expect(moment.dropDatetime.toISOString()).toBe("2026-08-25T08:00:00.000Z");
    });

    it("handles a zone with a half-hour offset", () => {
      const moment = computeDropMoment({
        targetDate: "2026-09-24",
        rule: { daysInAdvance: 30, releaseTime: "09:00", timezone: "Asia/Kolkata" },
      });

      // UTC+5:30, and no daylight saving at all.
      expect(moment.dropDatetime.toISOString()).toBe("2026-08-25T03:30:00.000Z");
    });
  });

  describe("rejects impossible input rather than guessing", () => {
    it.each([
      ["24/09/2026", "a non-ISO date"],
      ["2026-02-31", "a date that does not exist"],
      ["not a date", "nonsense"],
    ])("rejects targetDate %s (%s)", (targetDate) => {
      expect(() => computeDropMoment({ targetDate, rule: NY_MIDNIGHT_30 })).toThrow(
        /targetDate/,
      );
    });

    it.each([["9am"], ["24:00"], ["09:60"], ["9:00"], ["TODO"]])(
      "rejects releaseTime %s",
      (releaseTime) => {
        expect(() =>
          computeDropMoment({
            targetDate: "2026-09-24",
            rule: { ...NY_MIDNIGHT_30, releaseTime },
          }),
        ).toThrow(/releaseTime/);
      },
    );

    it("rejects an unknown timezone", () => {
      expect(() =>
        computeDropMoment({
          targetDate: "2026-09-24",
          rule: { ...NY_MIDNIGHT_30, timezone: "America/Nowhere" },
        }),
      ).toThrow(/timezone/);
    });

    it("rejects a fractional or negative days-in-advance", () => {
      for (const daysInAdvance of [1.5, -1]) {
        expect(() =>
          computeDropMoment({
            targetDate: "2026-09-24",
            rule: { ...NY_MIDNIGHT_30, daysInAdvance },
          }),
        ).toThrow(/daysInAdvance/);
      }
    });
  });
});

describe("zonedWallClockToInstant", () => {
  const NY = "America/New_York";

  it("resolves an ordinary time", () => {
    const instant = zonedWallClockToInstant(
      { year: 2026, month: 8, day: 25 },
      { hour: 0, minute: 0 },
      NY,
    );

    expect(instant.toISOString()).toBe("2026-08-25T04:00:00.000Z");
  });

  it("resolves a repeated hour to its first occurrence", () => {
    // Clocks go back at 02:00 on 1 November 2026, so 01:30 happens twice: once on
    // daylight time (05:30 UTC) and again on standard time (06:30 UTC). Choosing the
    // earlier one means an alert fires early rather than late, which is the safe
    // direction for this product.
    const instant = zonedWallClockToInstant(
      { year: 2026, month: 11, day: 1 },
      { hour: 1, minute: 30 },
      NY,
    );

    expect(instant.toISOString()).toBe("2026-11-01T05:30:00.000Z");
  });

  it("resolves a skipped hour to the instant just after the gap", () => {
    // Clocks jump from 02:00 to 03:00 on 8 March 2026, so 02:30 never happens. It
    // resolves to 03:30 EDT, which is what a person means by "02:30 that day".
    const instant = zonedWallClockToInstant(
      { year: 2026, month: 3, day: 8 },
      { hour: 2, minute: 30 },
      NY,
    );

    expect(instant.toISOString()).toBe("2026-03-08T07:30:00.000Z");
  });

  it("brackets the spring transition correctly on either side", () => {
    const before = zonedWallClockToInstant(
      { year: 2026, month: 3, day: 8 },
      { hour: 1, minute: 59 },
      NY,
    );
    const after = zonedWallClockToInstant(
      { year: 2026, month: 3, day: 8 },
      { hour: 3, minute: 0 },
      NY,
    );

    expect(before.toISOString()).toBe("2026-03-08T06:59:00.000Z");
    expect(after.toISOString()).toBe("2026-03-08T07:00:00.000Z");
  });
});
