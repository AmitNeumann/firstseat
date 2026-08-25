/**
 * Tests for the signed-out landing demo: Minetta-only parsing, and the countdown
 * phrasing the preview card prints.
 */

import { describe, expect, it } from "vitest";

import { Meal } from "@/generated/prisma/enums";
import { formatCountdown, isDropOpen } from "@/lib/watches/format";
import { parseLandingDemo } from "@/lib/watches/landing-demo";
import type { RestaurantOption } from "@/lib/watches/options";

const minetta: RestaurantOption = {
  id: "minetta",
  name: "Minetta Tavern",
  city: "New York",
  rules: [
    {
      platform: "resy",
      daysInAdvance: 30,
      releaseTime: "00:00",
      timezone: "America/New_York",
    },
  ],
};

const now = new Date("2026-08-24T12:00:00.000Z");

describe("parseLandingDemo", () => {
  it("returns unmatched for an empty sentence", () => {
    expect(parseLandingDemo("", minetta, now)).toEqual({ matched: false });
  });

  it("parses the placeholder example", () => {
    expect(
      parseLandingDemo("Minetta Tavern, Sept 24, dinner for 2", minetta, now),
    ).toEqual({
      matched: true,
      date: "2026-09-24",
      partySize: 2,
      meal: Meal.DINNER,
    });
  });

  it("does not reveal any other restaurant", () => {
    expect(parseLandingDemo("Via Carota, dinner for 2", minetta, now)).toEqual({
      matched: false,
    });
  });

  it("does not treat 'tavern' as a Minetta match", () => {
    expect(parseLandingDemo("some tavern, dinner for 2", minetta, now)).toEqual({
      matched: false,
    });
  });

  it("rolls a past calendar date into next year", () => {
    expect(parseLandingDemo("Minetta, Jan 2, lunch for 4", minetta, now)).toEqual({
      matched: true,
      date: "2027-01-02",
      partySize: 4,
      meal: Meal.LUNCH,
    });
  });
});

describe("formatCountdown", () => {
  it("hides seconds when a day or more remains", () => {
    const remaining =
      6 * 86_400_000 + 14 * 3_600_000 + 2 * 60_000 + 1_000;
    expect(formatCountdown(remaining)).toBe("6d 14h 02m");
  });

  it("shows seconds once under a day but at least an hour remains", () => {
    const remaining = 14 * 3_600_000 + 2 * 60_000 + 1_000;
    expect(formatCountdown(remaining)).toBe("14h 02m 01s");
  });

  it("ticks minutes and seconds under an hour", () => {
    expect(formatCountdown(2 * 60_000 + 1_000)).toBe("02:01");
  });

  it("reads OPEN at or after the drop", () => {
    expect(formatCountdown(0)).toBe("OPEN");
    expect(formatCountdown(-1_000)).toBe("OPEN");
  });
});

describe("isDropOpen", () => {
  const now = Date.parse("2026-08-25T12:00:00.000Z");

  it("is false before the drop", () => {
    expect(isDropOpen(now + 1_000, now)).toBe(false);
  });

  it("is true at the drop and for the next 30 minutes", () => {
    expect(isDropOpen(now, now)).toBe(true);
    expect(isDropOpen(now - 30 * 60_000 + 1, now)).toBe(true);
  });

  it("is false once more than 30 minutes have passed", () => {
    expect(isDropOpen(now - 30 * 60_000, now)).toBe(false);
    expect(isDropOpen(now - 31 * 60_000, now)).toBe(false);
  });
});
