/**
 * The parse endpoint's deterministic half: Zod + restaurant resolution.
 *
 * Gemini is not called here. The model output is treated like any other untrusted JSON.
 */

import { describe, expect, it } from "vitest";

import { Meal } from "@/generated/prisma/enums";
import { PARSE_MAX_CHARS } from "@/lib/watches/parse-limits";
import {
  PARSE_MAX_CALLS_PER_DAY,
  consumeParseAllowance,
} from "@/lib/watches/parse-rate-limit";
import { proposeWatchFields, resolveRestaurantName, isCompleteProposal, summariseProposal } from "@/lib/watches/parse";
import type { RestaurantOption } from "@/lib/watches/options";

function restaurant(name: string, city = "New York"): RestaurantOption {
  return {
    id: name,
    name,
    city,
    rules: [
      {
        platform: "resy",
        daysInAdvance: 30,
        releaseTime: "00:00",
        timezone: "America/New_York",
      },
    ],
  };
}

const list = [
  restaurant("Minetta Tavern"),
  restaurant("Via Carota"),
  restaurant("The Four Horsemen"),
  restaurant("Don Angie"),
  restaurant("Minetta Bar"),
];

describe("resolveRestaurantName", () => {
  it("matches a distinctive word to the seeded name", () => {
    const resolved = resolveRestaurantName(list, "Minetta Tavern");

    expect(resolved.status).toBe("matched");
    expect(resolved.status === "matched" && resolved.restaurant.name).toBe("Minetta Tavern");
  });

  it("matches a partial distinctive name", () => {
    const resolved = resolveRestaurantName(list, "via carota");

    expect(resolved.status).toBe("matched");
    expect(resolved.status === "matched" && resolved.restaurant.name).toBe("Via Carota");
  });

  it("does not invent a restaurant we do not track", () => {
    expect(resolveRestaurantName(list, "Carbone").status).toBe("none");
  });

  it("does not treat a city as a restaurant name", () => {
    expect(resolveRestaurantName(list, "New York").status).toBe("none");
  });

  it("refuses to guess when two names fit", () => {
    expect(resolveRestaurantName(list, "Minetta").status).toBe("ambiguous");
  });
});

describe("proposeWatchFields", () => {
  const bounds = { earliestDate: "2026-08-26", latestDate: "2027-10-01" };

  it("returns a proposal the form can pre-fill", () => {
    const outcome = proposeWatchFields({
      model: {
        restaurant: "Minetta Tavern",
        date: "2026-09-24",
        partySize: 2,
        meal: "DINNER",
      },
      restaurants: list,
      ...bounds,
    });

    expect(outcome).toEqual({
      ok: true,
      proposal: {
        restaurantId: "Minetta Tavern",
        restaurantName: "Minetta Tavern",
        targetDate: "2026-09-24",
        partySize: 2,
        meal: Meal.DINNER,
      },
    });
  });

  it("accepts a lowercase meal and a party size sent as a string", () => {
    const outcome = proposeWatchFields({
      model: {
        restaurant: "Don Angie",
        date: "2026-09-24",
        partySize: "4",
        meal: "dinner",
      },
      restaurants: list,
      ...bounds,
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.ok && outcome.proposal.partySize).toBe(4);
    expect(outcome.ok && outcome.proposal.meal).toBe(Meal.DINNER);
  });

  it("tells the user when the restaurant is not in the seed", () => {
    const outcome = proposeWatchFields({
      model: { restaurant: "Carbone", date: "2026-09-24", partySize: 2, meal: "DINNER" },
      restaurants: list,
      ...bounds,
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.ok === false && outcome.error).toMatch(/don't track that restaurant/i);
  });

  it("keeps the restaurant and drops a nonsense date or party rather than failing", () => {
    const outcome = proposeWatchFields({
      model: {
        restaurant: "Via Carota",
        date: "1987-01-01",
        partySize: 400,
        meal: "midnight snack",
      },
      restaurants: list,
      ...bounds,
    });

    expect(outcome).toEqual({
      ok: true,
      proposal: {
        restaurantId: "Via Carota",
        restaurantName: "Via Carota",
      },
    });
  });

  it("drops a date that is not a real calendar day", () => {
    const outcome = proposeWatchFields({
      model: { restaurant: "Via Carota", date: "2026-02-31", partySize: 2, meal: "LUNCH" },
      restaurants: list,
      ...bounds,
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.ok && outcome.proposal.targetDate).toBeUndefined();
    expect(outcome.ok && outcome.proposal.partySize).toBe(2);
  });

  it("rejects JSON that is not an object with a restaurant", () => {
    const outcome = proposeWatchFields({
      model: ["Minetta"],
      restaurants: list,
      ...bounds,
    });

    expect(outcome.ok).toBe(false);
  });
});

describe("parse rate limit", () => {
  it("allows a burst and then refuses", () => {
    const userId = `test-${Math.random()}`;

    for (let i = 0; i < PARSE_MAX_CALLS_PER_DAY; i += 1) {
      expect(consumeParseAllowance(userId, 1_000 + i)).toBe(true);
    }

    expect(consumeParseAllowance(userId, 1_000 + PARSE_MAX_CALLS_PER_DAY)).toBe(false);
  });
});

describe("summariseProposal", () => {
  it("joins the fields the diner confirms", () => {
    expect(
      summariseProposal({
        restaurantId: "Minetta Tavern",
        restaurantName: "Minetta Tavern",
        targetDate: "2026-09-29",
        partySize: 2,
        meal: Meal.DINNER,
      }),
    ).toBe("Minetta Tavern · 29 Sept 2026 · Dinner · Party of 2");
  });

  it("omits fields the parse did not fill", () => {
    expect(
      summariseProposal({
        restaurantId: "Via Carota",
        restaurantName: "Via Carota",
        meal: Meal.LUNCH,
      }),
    ).toBe("Via Carota · Lunch");
  });
});

describe("isCompleteProposal", () => {
  it("is true only when createWatch has every field", () => {
    const full = {
      restaurantId: "Minetta Tavern",
      restaurantName: "Minetta Tavern",
      targetDate: "2026-09-29",
      partySize: 2,
      meal: Meal.DINNER,
    };

    expect(isCompleteProposal(full)).toBe(true);
    expect(isCompleteProposal({ ...full, targetDate: undefined })).toBe(false);
  });
});

describe("PARSE_MAX_CHARS", () => {
  it("caps the sentence length", () => {
    expect(PARSE_MAX_CHARS).toBe(280);
  });
});
