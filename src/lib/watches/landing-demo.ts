/**
 * The signed-out landing demo.
 *
 * The catalog is gated: a visitor who is not signed in never receives the restaurant
 * list. They get one worked example — Minetta Tavern — so they can see the drop-time
 * math without us handing over the dataset that is the product.
 *
 * The sentence parser is deliberately small and local. It is not the planned AI endpoint;
 * it only has to recognise Minetta plus a date, meal and party size so the "Try it" card
 * can preview a real `computeDropMoment` result.
 */

import { Meal } from "@/generated/prisma/enums";
import type { RestaurantOption } from "@/lib/watches/options";

export const LANDING_DEMO_NAME = "Minetta Tavern";
export const LANDING_DEMO_CITY = "New York";
export const LANDING_DEMO_PLACEHOLDER = "Minetta Tavern, Sept 24, dinner for 2";

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

export type LandingDemoParse = {
  /** True only when the sentence is asking about the Minetta demo restaurant. */
  matched: boolean;
  date?: string;
  partySize?: number;
  meal?: Meal;
};

const GENERIC_NAME_WORDS = new Set([
  "tavern",
  "house",
  "restaurant",
  "cafe",
  "bar",
  "grill",
  "kitchen",
  "bistro",
]);

/**
 * Whether this sentence is trying to watch Minetta, rather than some other restaurant.
 *
 * `matchesQuery` requires every word to appear in the name, so it cannot be run on the
 * whole sentence ("Sept", "dinner"). We look for a distinctive name word instead —
 * "Minetta", not "Tavern".
 */
export function mentionsLandingDemo(text: string, restaurant: RestaurantOption): boolean {
  const haystack = text.toLowerCase();
  const nameWords = restaurant.name
    .toLowerCase()
    .split(/[\s']+/)
    .filter((word) => word.length > 3 && !GENERIC_NAME_WORDS.has(word));

  return nameWords.some((word) => haystack.includes(word));
}

/**
 * Pull a date, party size and meal out of a free-text sentence.
 *
 * `now` is passed in so the year-roll ("Sept 24" meaning next year once September has
 * gone) is testable, the same way `computeDropMoment` never reads the clock itself.
 */
export function parseLandingDemo(
  text: string,
  restaurant: RestaurantOption,
  now: Date = new Date(),
): LandingDemoParse {
  const trimmed = text.trim();

  if (!trimmed) {
    return { matched: false };
  }

  // Guard: this parser is only allowed to resolve the demo restaurant, even if the
  // sentence names something we do track. The catalog stays behind the sign-in wall.
  if (!mentionsLandingDemo(trimmed, restaurant)) {
    return { matched: false };
  }

  const lower = trimmed.toLowerCase();
  const result: LandingDemoParse = { matched: true };

  const monthIndex = MONTHS.findIndex((month) => lower.includes(month.slice(0, 3)));

  if (monthIndex >= 0) {
    const stem = MONTHS[monthIndex].slice(0, 3);
    const dayMatch =
      lower.match(new RegExp(`${stem}[a-z]*\\.?\\s*,?\\s*(\\d{1,2})`)) ??
      lower.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s*)?${stem}`));

    if (dayMatch) {
      const day = Number(dayMatch[1]);
      const year = now.getUTCFullYear();
      const candidate = Date.UTC(year, monthIndex, day, 12);
      const rolled = candidate < now.getTime() ? Date.UTC(year + 1, monthIndex, day, 12) : candidate;
      const iso = new Date(rolled).toISOString().slice(0, 10);
      result.date = iso;
    }
  }

  const party = lower.match(
    /(?:for|party of|table for)\s*(\d{1,2})|(\d{1,2})\s*(?:people|guests|pax)/,
  );

  if (party) {
    result.partySize = Number(party[1] || party[2]);
  }

  if (/\bbreakfast\b/.test(lower)) {
    result.meal = Meal.BREAKFAST;
  } else if (/\bbrunch\b/.test(lower)) {
    result.meal = Meal.BRUNCH;
  } else if (/\blunch\b/.test(lower)) {
    result.meal = Meal.LUNCH;
  } else if (/\bdinner\b/.test(lower)) {
    result.meal = Meal.DINNER;
  }

  return result;
}
