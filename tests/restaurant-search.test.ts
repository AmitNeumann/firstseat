/**
 * Tests for the type-to-search matching behind the restaurant picker.
 *
 * The matching is a plain function precisely so it can be tested here, rather than only
 * by rendering a combobox and typing into it.
 */

import { describe, expect, it } from "vitest";

import { Platform } from "@/generated/prisma/enums";
import {
  filterRestaurants,
  matchesQuery,
  normaliseForSearch,
  type RestaurantOption,
} from "@/lib/watches/options";

function restaurant(name: string, city = "New York"): RestaurantOption {
  return {
    id: name,
    name,
    city,
    rules: [
      {
        platform: Platform.RESY,
        daysInAdvance: 30,
        releaseTime: "00:00",
        timezone: "America/New_York",
      },
    ],
  };
}

const list = [
  restaurant("Minetta Tavern"),
  restaurant("Carbone"),
  restaurant("4 Charles Prime Rib"),
  restaurant("Don Angie"),
  restaurant("Rezdôra"),
  restaurant("Semma"),
  restaurant("The Ledbury", "London"),
];

function namesMatching(query: string): string[] {
  return filterRestaurants(list, query).map((entry) => entry.name);
}

describe("normaliseForSearch", () => {
  it("strips accents so a plain keyboard can find an accented name", () => {
    expect(normaliseForSearch("Rezdôra")).toBe("rezdora");
  });

  it("lowercases and trims", () => {
    expect(normaliseForSearch("  Don Angie  ")).toBe("don angie");
  });
});

describe("matchesQuery", () => {
  it("matches a word from the middle of the name, not just the start", () => {
    // People search for the distinctive word: "angie", not "don".
    expect(matchesQuery(restaurant("Don Angie"), "angie")).toBe(true);
  });

  it("matches words in any order", () => {
    expect(matchesQuery(restaurant("4 Charles Prime Rib"), "prime charles")).toBe(true);
  });

  it("requires every word to appear", () => {
    expect(matchesQuery(restaurant("4 Charles Prime Rib"), "prime lobster")).toBe(false);
  });

  it("ignores case and accents", () => {
    expect(matchesQuery(restaurant("Rezdôra"), "REZDORA")).toBe(true);
  });

  it("matches on city as well as name", () => {
    expect(matchesQuery(restaurant("The Ledbury", "London"), "london")).toBe(true);
  });

  it("treats an empty query as matching everything", () => {
    expect(matchesQuery(restaurant("Carbone"), "")).toBe(true);
    expect(matchesQuery(restaurant("Carbone"), "   ")).toBe(true);
  });
});

describe("filterRestaurants", () => {
  it("narrows as more is typed", () => {
    expect(namesMatching("c")).toEqual(["Carbone", "4 Charles Prime Rib"]);
    expect(namesMatching("car")).toEqual(["Carbone"]);
  });

  it("returns the whole list for an empty query", () => {
    expect(filterRestaurants(list, "")).toHaveLength(list.length);
  });

  it("returns nothing for a restaurant we do not track", () => {
    // The picker shows this as "no restaurant matches", which is the honest answer: a
    // restaurant with no release rule is one we cannot work out a drop time for.
    expect(namesMatching("nobu")).toEqual([]);
  });

  it("keeps the given order rather than resorting", () => {
    // Searching by city is how you narrow to one place; the alphabetical order the query
    // returned is preserved rather than being re-sorted by relevance.
    expect(namesMatching("new york")).toEqual([
      "Minetta Tavern",
      "Carbone",
      "4 Charles Prime Rib",
      "Don Angie",
      "Rezdôra",
      "Semma",
    ]);
  });
});
