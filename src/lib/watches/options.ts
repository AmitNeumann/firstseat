/**
 * The restaurant list as the form needs it, plus the matching rule behind the
 * type-to-search box.
 *
 * Kept separate from the components so the matching logic is a plain function that can be
 * unit tested, rather than something you can only exercise by rendering a combobox and
 * typing into it.
 */

import type { Platform } from "@/generated/prisma/enums";
import { PLATFORM_LABELS } from "@/lib/watches/format";

export type RestaurantRuleOption = {
  platform: Platform;
  daysInAdvance: number;
  /** Wall-clock "HH:MM" in `timezone`. */
  releaseTime: string;
  timezone: string;
};

export type RestaurantOption = {
  id: string;
  name: string;
  city: string;
  rules: RestaurantRuleOption[];
};

/**
 * Everything a search should match against: the name and the city.
 *
 * Accents are stripped so "rezdora" finds "Rezdôra" — a diner should not have to know
 * where the circumflex goes to find the restaurant they are looking for.
 */
export function normaliseForSearch(value: string): string {
  return (
    value
      // NFD splits an accented letter into the plain letter plus a combining mark…
      .normalize("NFD")
      // …which this then removes, leaving "ô" as "o".
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
  );
}

/**
 * Whether a restaurant matches what has been typed.
 *
 * Every whitespace-separated word must appear somewhere in the name or city, in any
 * order, so "prime charles" still finds "4 Charles Prime Rib". Substring matching rather
 * than prefix matching, because people search for the distinctive word rather than the
 * first one — "angie" should find "Don Angie".
 */
export function matchesQuery(restaurant: RestaurantOption, query: string): boolean {
  const words = normaliseForSearch(query).split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return true;
  }

  const haystack = normaliseForSearch(`${restaurant.name} ${restaurant.city}`);

  return words.every((word) => haystack.includes(word));
}

/** The restaurants matching a query, in the order they were given. */
export function filterRestaurants(
  restaurants: RestaurantOption[],
  query: string,
): RestaurantOption[] {
  return restaurants.filter((restaurant) => matchesQuery(restaurant, query));
}

/** e.g. "Minetta Tavern, New York". */
export function restaurantLabel(restaurant: RestaurantOption): string {
  return `${restaurant.name}, ${restaurant.city}`;
}

/**
 * What we know about a restaurant's release schedule, in one line, so the choice is
 * informed: "Resy · 30 days ahead" tells the user when to expect the alert.
 */
export function summariseRules(rules: RestaurantRuleOption[]): string {
  return rules
    .map((rule) => `${PLATFORM_LABELS[rule.platform]} · ${rule.daysInAdvance} days ahead`)
    .join(" / ");
}
