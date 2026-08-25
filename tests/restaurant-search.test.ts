/**
 * Tests for the type-to-search matching behind the restaurant picker.
 *
 * The matching is a plain function precisely so it can be tested here, rather than only
 * by rendering a combobox and typing into it.
 */

import { describe, expect, it } from "vitest";

import {
  catalogCards,
  catalogPills,
  describeReleaseSchedule,
  filterCatalog,
  filterRestaurants,
  matchesQuery,
  normaliseForSearch,
  watchCreationPath,
  type RestaurantOption,
} from "@/lib/watches/options";

function restaurant(
  name: string,
  city = "New York",
  rules?: RestaurantOption["rules"],
): RestaurantOption {
  return {
    id: name,
    name,
    city,
    rules: rules ?? [
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

describe("catalogPills", () => {
  it("lists All, each platform that exists, and midnight when someone drops at 00:00", () => {
    const pills = catalogPills([
      restaurant("Minetta Tavern"),
      restaurant("Don Angie", "New York", [
        {
          platform: "opentable",
          daysInAdvance: 7,
          releaseTime: "09:00",
          timezone: "America/New_York",
        },
      ]),
    ]);

    expect(pills.map((pill) => pill.id)).toEqual([
      "all",
      "platform:resy",
      "platform:opentable",
      "midnight",
    ]);
    expect(pills.map((pill) => pill.label)).toEqual([
      "All",
      "Resy",
      "OpenTable",
      "Drops at midnight",
    ]);
  });

  it("omits Tock when no restaurant uses it, and omits midnight when nobody drops then", () => {
    const pills = catalogPills([
      restaurant("Via Carota", "New York", [
        {
          platform: "resy",
          daysInAdvance: 30,
          releaseTime: "10:00",
          timezone: "America/New_York",
        },
      ]),
    ]);

    expect(pills.map((pill) => pill.id)).toEqual(["all", "platform:resy"]);
  });
});

describe("filterCatalog", () => {
  const rooms = [
    restaurant("Minetta Tavern"),
    restaurant("Don Angie", "New York", [
      {
        platform: "opentable",
        daysInAdvance: 7,
        releaseTime: "09:00",
        timezone: "America/New_York",
      },
    ]),
    restaurant("Via Carota", "New York", [
      {
        platform: "resy",
        daysInAdvance: 30,
        releaseTime: "10:00",
        timezone: "America/New_York",
      },
    ]),
  ];

  it("keeps everyone on All", () => {
    expect(filterCatalog(rooms, "", "all").map((entry) => entry.name)).toEqual([
      "Minetta Tavern",
      "Don Angie",
      "Via Carota",
    ]);
  });

  it("narrows to a platform without inventing rooms that are not there", () => {
    expect(filterCatalog(rooms, "", "platform:opentable").map((entry) => entry.name)).toEqual([
      "Don Angie",
    ]);
    expect(filterCatalog(rooms, "", "platform:tock")).toEqual([]);
  });

  it("keeps only midnight drops", () => {
    expect(filterCatalog(rooms, "", "midnight").map((entry) => entry.name)).toEqual([
      "Minetta Tavern",
    ]);
  });

  it("applies search on top of a chip", () => {
    expect(filterCatalog(rooms, "via", "platform:resy").map((entry) => entry.name)).toEqual([
      "Via Carota",
    ]);
    expect(filterCatalog(rooms, "via", "midnight")).toEqual([]);
  });
});

describe("catalogCards", () => {
  const rooms = [
    restaurant("Minetta Tavern"),
    restaurant("Don Angie"),
    restaurant("Via Carota"),
  ];

  it("keeps the full chip-filtered list until a selection is committed", () => {
    expect(filterCatalog(rooms, "d", "all").map((entry) => entry.name)).toEqual(["Don Angie"]);
    expect(catalogCards(rooms, { kind: "all" }, "all").map((entry) => entry.name)).toEqual([
      "Minetta Tavern",
      "Don Angie",
      "Via Carota",
    ]);
  });

  it("shows one restaurant after a pick", () => {
    expect(
      catalogCards(rooms, { kind: "restaurant", id: "Don Angie" }, "all").map(
        (entry) => entry.name,
      ),
    ).toEqual(["Don Angie"]);
  });
});

describe("describeReleaseSchedule", () => {
  it("quotes the New York hour as ET", () => {
    expect(
      describeReleaseSchedule([
        {
          platform: "resy",
          daysInAdvance: 30,
          releaseTime: "00:00",
          timezone: "America/New_York",
        },
      ]),
    ).toBe("Releases 30 days ahead, 00:00 ET");
  });
});

describe("watchCreationPath", () => {
  it("sends the chosen restaurant into the create-watch form", () => {
    expect(watchCreationPath("abc-123")).toBe("/watches/new?restaurantId=abc-123");
  });
});
