/**
 * Tests for the guards on hand-entered restaurant data.
 *
 * The seed file is typed by hand from booking sites, so these are the checks that stand
 * between a mistyped release time and a database full of alerts that fire at the wrong
 * moment. They are worth testing precisely because bad seed data is invisible once it has
 * been written.
 */

import { describe, expect, it } from "vitest";

import { RestaurantSeedSchema } from "../prisma/seed/validate";
import { TODO, missingFields, type RestaurantSeed } from "../prisma/seed/types";

/** A complete, valid entry. Every test below is this with one thing changed. */
function entry(overrides: Record<string, unknown> = {}, ruleOverrides: Record<string, unknown> = {}) {
  return {
    name: "The Example Room",
    city: "New York",
    releaseRule: {
      platform: "Resy",
      daysInAdvance: 30,
      releaseTime: "00:00",
      timezone: "America/New_York",
      bookingUrl: "https://resy.com/cities/new-york-ny/venues/example",
      ...ruleOverrides,
    },
    source: "resy.com venue page, checked 2026-08-20",
    ...overrides,
  };
}

/** The field paths a rejected entry complained about. */
function problemPaths(value: unknown): string[] {
  const parsed = RestaurantSeedSchema.safeParse(value);

  expect(parsed.success).toBe(false);

  return parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join("."));
}

describe("RestaurantSeedSchema", () => {
  it("accepts a fully researched entry", () => {
    const parsed = RestaurantSeedSchema.safeParse(entry());

    expect(parsed.success).toBe(true);
  });

  it("normalises however the platform was written into one canonical slug", () => {
    // Otherwise the same platform arrives as "Resy", "resy" and "RESY", and the database
    // treats them as three platforms — defeating the one-rule-per-platform constraint.
    for (const written of ["Resy", "resy", "RESY", "  Resy  "]) {
      const parsed = RestaurantSeedSchema.safeParse(entry({}, { platform: written }));

      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data.releaseRule.platform).toBe("resy");
    }
  });

  it("accepts a platform beyond the ones we recognise", () => {
    // The whole point of dropping the enum: a restaurant on a platform we have never
    // heard of must still be addable, without a schema migration.
    const parsed = RestaurantSeedSchema.safeParse(
      entry({}, { platform: "Table Check", bookingUrl: "https://tablecheck.example/x" }),
    );

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.releaseRule.platform).toBe("table-check");
  });

  it("does not cross-check the host of a platform we do not recognise", () => {
    // There is nothing to compare it against, so any host has to be allowed.
    expect(
      RestaurantSeedSchema.safeParse(
        entry({}, { platform: "Some New Thing", bookingUrl: "https://anything.example/x" }),
      ).success,
    ).toBe(true);
  });

  it.each([["DoorDash", "doordash"], ["SevenRooms", "sevenrooms"], ["OpenTable", "opentable"]])(
    "recognises %s",
    (written, slug) => {
      const parsed = RestaurantSeedSchema.safeParse(
        entry({}, { platform: written, bookingUrl: `https://www.${slug}.com/x` }),
      );

      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data.releaseRule.platform).toBe(slug);
    },
  );

  it.each([["resy!"], ["<script>"], ["resy.com/x"], ["a".repeat(41)], [""]])(
    "rejects platform %s as not a usable label",
    (platform) => {
      // Open-ended is not the same as unvalidated: the column has a CHECK constraint of
      // the same shape, so anything Zod lets through must satisfy it.
      expect(problemPaths(entry({}, { platform }))).toContain("releaseRule.platform");
    },
  );

  it("rejects a booking link that is not https", () => {
    // Alerts link the user straight to this URL, so plain http is a page a network
    // attacker on the user's wifi can rewrite.
    expect(problemPaths(entry({}, { bookingUrl: "http://resy.com/x" }))).toContain(
      "releaseRule.bookingUrl",
    );
  });

  it("rejects a booking link on a platform other than the one declared", () => {
    // The single most likely data-entry slip: write "Resy", paste a Tock link.
    expect(
      problemPaths(
        entry({}, { platform: "Resy", bookingUrl: "https://www.exploretock.com/example" }),
      ),
    ).toContain("releaseRule.bookingUrl");
  });

  it("accepts a subdomain of the platform's own host", () => {
    const parsed = RestaurantSeedSchema.safeParse(
      entry({}, { platform: "Tock", bookingUrl: "https://www.exploretock.com/example" }),
    );

    expect(parsed.success).toBe(true);
  });

  it("allows any host when the platform is the restaurant's own site", () => {
    const parsed = RestaurantSeedSchema.safeParse(
      entry({}, { platform: "Direct", bookingUrl: "https://example-room.nyc/reserve" }),
    );

    expect(parsed.success).toBe(true);
  });

  it.each([["9am"], ["9:00"], ["24:00"], ["09:60"], ["noon"]])(
    "rejects release time %s",
    (releaseTime) => {
      expect(problemPaths(entry({}, { releaseTime }))).toContain("releaseRule.releaseTime");
    },
  );

  it.each([["00:00"], ["09:30"], ["23:59"]])("accepts release time %s", (releaseTime) => {
    expect(RestaurantSeedSchema.safeParse(entry({}, { releaseTime })).success).toBe(true);
  });

  it("rejects a date pasted where a day count belongs", () => {
    expect(problemPaths(entry({}, { daysInAdvance: 20260924 }))).toContain(
      "releaseRule.daysInAdvance",
    );
  });

  it.each([[0], [-1], [1.5]])("rejects daysInAdvance %s", (daysInAdvance) => {
    expect(problemPaths(entry({}, { daysInAdvance }))).toContain("releaseRule.daysInAdvance");
  });

  it("rejects a timezone that is not an IANA name", () => {
    expect(problemPaths(entry({}, { timezone: "EST" }))).toContain("releaseRule.timezone");
  });

  it("rejects a source too thin to be a real citation", () => {
    expect(problemPaths(entry({ source: "resy" }))).toContain("source");
  });

  it("rejects a placeholder that reached validation", () => {
    // Belt and braces: `missingFields` should have caught this first, but a TODO must
    // never be writable as a literal value either.
    const paths = problemPaths(entry({ source: TODO }, { releaseTime: TODO }));

    expect(paths).toContain("source");
    expect(paths).toContain("releaseRule.releaseTime");
  });

});

describe("missingFields", () => {
  it("names every unresearched field", () => {
    const unresearched: RestaurantSeed = {
      name: "Somewhere",
      city: "New York",
      releaseRule: {
        platform: TODO,
        daysInAdvance: TODO,
        releaseTime: TODO,
        timezone: "America/New_York",
        bookingUrl: TODO,
      },
      source: TODO,
    };

    expect(missingFields(unresearched)).toEqual([
      "source",
      "releaseRule.platform",
      "releaseRule.daysInAdvance",
      "releaseRule.releaseTime",
      "releaseRule.bookingUrl",
    ]);
  });

  it("reports nothing for a fully researched entry", () => {
    expect(missingFields(entry() as RestaurantSeed)).toEqual([]);
  });
});
