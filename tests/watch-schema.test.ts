/**
 * Tests for the watch form's server-side validation.
 *
 * The browser's `<select>` and `<input type="date">` make most of these impossible to
 * trigger by clicking. That is exactly why they are tested: a form submission is just an
 * HTTP request, and these rules are what stands up to one written by hand.
 */

import { describe, expect, it } from "vitest";

import { CancelWatchSchema, CreateWatchSchema, MAX_PARTY_SIZE } from "@/lib/watches/schemas";

const RESTAURANT_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

/** A valid submission. Each test changes one field. */
function submission(overrides: Record<string, unknown> = {}) {
  return {
    restaurantId: RESTAURANT_ID,
    targetDate: "2026-09-24",
    // Everything out of a form arrives as a string, including numbers.
    partySize: "2",
    meal: "DINNER",
    ...overrides,
  };
}

function problemPaths(value: unknown): string[] {
  const parsed = CreateWatchSchema.safeParse(value);

  expect(parsed.success).toBe(false);

  return parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join("."));
}

describe("CreateWatchSchema", () => {
  it("accepts a well-formed submission and turns the party size into a number", () => {
    const parsed = CreateWatchSchema.safeParse(submission());

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.partySize).toBe(2);
  });

  it.each([
    ["", "empty"],
    ["not-a-uuid", "not a uuid"],
    ["1; DROP TABLE watches", "an injection attempt"],
  ])("rejects restaurantId %s (%s)", (restaurantId) => {
    expect(problemPaths(submission({ restaurantId }))).toContain("restaurantId");
  });

  it("rejects a date that does not exist", () => {
    // The browser date picker cannot produce this; a hand-written request can.
    expect(problemPaths(submission({ targetDate: "2026-02-31" }))).toContain("targetDate");
  });

  it.each([["24/09/2026"], ["2026-9-4"], ["tomorrow"], [""]])(
    "rejects target date %s",
    (targetDate) => {
      expect(problemPaths(submission({ targetDate }))).toContain("targetDate");
    },
  );

  it.each([["0"], ["-2"], ["2.5"], ["abc"], [""], [String(MAX_PARTY_SIZE + 1)]])(
    "rejects party size %s",
    (partySize) => {
      expect(problemPaths(submission({ partySize }))).toContain("partySize");
    },
  );

  it("accepts the largest allowed party", () => {
    const parsed = CreateWatchSchema.safeParse(
      submission({ partySize: String(MAX_PARTY_SIZE) }),
    );

    expect(parsed.success).toBe(true);
  });

  it.each([["SUPPER"], ["dinner"], [""], ["DINNER; DELETE"]])(
    "rejects meal %s",
    (meal) => {
      expect(problemPaths(submission({ meal }))).toContain("meal");
    },
  );

  it("reports every bad field at once rather than stopping at the first", () => {
    const paths = problemPaths({
      restaurantId: "nope",
      targetDate: "nope",
      partySize: "nope",
      meal: "nope",
    });

    expect(new Set(paths)).toEqual(
      new Set(["restaurantId", "targetDate", "partySize", "meal"]),
    );
  });

  it("ignores extra fields rather than passing them through", () => {
    // A submission carrying `userId` or `status` must not be able to set them. Zod
    // strips unknown keys, so only the four declared fields survive.
    const parsed = CreateWatchSchema.safeParse(
      submission({ userId: "someone-else", status: "FULFILLED" }),
    );

    expect(parsed.success).toBe(true);
    expect(parsed.success && Object.keys(parsed.data).sort()).toEqual([
      "meal",
      "partySize",
      "restaurantId",
      "targetDate",
    ]);
  });
});

describe("CancelWatchSchema", () => {
  it("accepts a uuid", () => {
    expect(CancelWatchSchema.safeParse({ watchId: RESTAURANT_ID }).success).toBe(true);
  });

  it.each([[""], ["nope"], [undefined], [null]])("rejects watchId %s", (watchId) => {
    expect(CancelWatchSchema.safeParse({ watchId }).success).toBe(false);
  });
});
