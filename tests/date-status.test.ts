import { describe, expect, it } from "vitest";

import {
  BOOKING_WINDOW_OPENED_PREVIEW_MESSAGE,
  diningDateIsPast,
  PAST_DINING_DATE_MESSAGE,
} from "@/lib/watches/date-status";

describe("diningDateIsPast", () => {
  const zone = "America/New_York";
  const afternoonOnThe28th = new Date("2026-08-28T18:00:00.000Z");

  it("treats last year as a dining day that has already passed", () => {
    expect(diningDateIsPast("2025-09-24", afternoonOnThe28th, zone)).toBe(true);
  });

  it("does not treat a later dining day as past just because its booking window opened", () => {
    expect(diningDateIsPast("2026-09-24", afternoonOnThe28th, zone)).toBe(false);
  });

  it("uses the restaurant's calendar, not UTC", () => {
    const justAfterMidnightUtc = new Date("2026-08-29T03:30:00.000Z");

    expect(
      diningDateIsPast("2026-08-28", justAfterMidnightUtc, "America/New_York"),
    ).toBe(false);
    expect(
      diningDateIsPast("2026-08-28", justAfterMidnightUtc, "Pacific/Auckland"),
    ).toBe(true);
  });
});

describe("refusal copy", () => {
  it("keeps the past-date sentence distinct from the already-opened window", () => {
    expect(PAST_DINING_DATE_MESSAGE).toContain("already passed");
    expect(BOOKING_WINDOW_OPENED_PREVIEW_MESSAGE).toContain("already opened");
    expect(PAST_DINING_DATE_MESSAGE).not.toContain("already opened");
  });
});
