/**
 * The signed-out landing demo.
 *
 * The catalog is gated: a visitor who is not signed in never receives the restaurant
 * list. They get one worked example — Minetta Tavern — so they can see the drop-time
 * math without us handing over the dataset that is the product.
 *
 * The sentence parser is deliberately small and local. It is not the Gemini endpoint
 * (that stays on signed-in create-watch). It only has to read a date, meal and party
 * size so the "Try it" card can preview a real `computeDropMoment` result.
 */

import { Meal } from "@/generated/prisma/enums";
import {
  addDays,
  civilDateInZone,
  formatCivilDate,
  parseCivilDate,
} from "@/lib/time";
import { computeDropMoment } from "@/lib/watches/drop-time";
import { normaliseForSearch, type RestaurantOption } from "@/lib/watches/options";
import { MAX_PARTY_SIZE } from "@/lib/watches/schemas";

export const LANDING_DEMO_NAME = "Minetta Tavern";
export const LANDING_DEMO_CITY = "New York";
export const LANDING_DEMO_PLACEHOLDER = "Minetta Tavern, Sept 24, dinner for 2";

/** Longer aliases first so "september" / "sept" win over "sep". */
const MONTH_ALIASES: [string, number][] = [
  ["january", 1],
  ["february", 2],
  ["september", 9],
  ["october", 10],
  ["november", 11],
  ["december", 12],
  ["august", 8],
  ["march", 3],
  ["april", 4],
  ["june", 6],
  ["july", 7],
  ["jan", 1],
  ["feb", 2],
  ["mar", 3],
  ["apr", 4],
  ["may", 5],
  ["jun", 6],
  ["jul", 7],
  ["aug", 8],
  ["sept", 9],
  ["sep", 9],
  ["oct", 10],
  ["nov", 11],
  ["dec", 12],
];

const MONTH_ALT = MONTH_ALIASES.map(([name]) => name).join("|");

const MONTH_BY_ALIAS = new Map(MONTH_ALIASES);

const WORD_PARTY: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
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

const NOISE_WORDS = new Set([
  ...MONTH_ALIASES.map(([name]) => name),
  ...GENERIC_NAME_WORDS,
  ...Object.keys(WORD_PARTY),
  "minetta",
  "breakfast",
  "brunch",
  "lunch",
  "dinner",
  "supper",
  "for",
  "of",
  "party",
  "table",
  "people",
  "guests",
  "pax",
  "the",
  "a",
  "an",
  "at",
  "on",
  "in",
  "and",
  "to",
  "with",
  "today",
  "tomorrow",
  "next",
  "this",
  "st",
  "nd",
  "rd",
  "th",
  "new",
  "york",
  "nyc",
]);

export type LandingDemoParse = {
  /** True only when the sentence is asking about the Minetta demo restaurant. */
  matched: boolean;
  date?: string;
  partySize?: number;
  meal?: Meal;
};

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
 * `now` and `timeZone` are passed in so the year-roll ("Sept 24" meaning next year once
 * that table has already dropped) is testable, the same way `computeDropMoment` never
 * reads the clock itself.
 */
export function parseLandingDemo(
  text: string,
  restaurant: RestaurantOption,
  now: Date = new Date(),
  timeZone = "UTC",
): LandingDemoParse {
  const trimmed = text.trim();

  if (!trimmed) {
    return { matched: false };
  }

  const namedMinetta = mentionsLandingDemo(trimmed, restaurant);
  const namedSomeoneElse = leftoverNameTokens(trimmed).length > 0;

  // Guard: this parser is only allowed to resolve the demo restaurant. Naming anyone
  // else keeps the catalog behind the sign-in wall. A sentence with no restaurant
  // still previews Minetta — that is the whole point of the demo.
  if (!namedMinetta && namedSomeoneElse) {
    return { matched: false };
  }

  const lower = trimmed.toLowerCase();
  const result: LandingDemoParse = { matched: true };
  const date = parseDemoDate(lower, now, timeZone, restaurant);

  if (date) {
    result.date = date;
  }

  const partySize = parseDemoParty(lower);

  if (partySize !== undefined) {
    result.partySize = partySize;
  }

  const meal = parseDemoMeal(lower);

  if (meal) {
    result.meal = meal;
  }

  return result;
}

function leftoverNameTokens(text: string): string[] {
  return normaliseForSearch(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !NOISE_WORDS.has(word) && !/^\d+(?:st|nd|rd|th)?$/.test(word));
}

function parseDemoDate(
  lower: string,
  now: Date,
  timeZone: string,
  restaurant: RestaurantOption,
): string | undefined {
  if (/\btoday\b/.test(lower)) {
    return formatCivilDate(civilDateInZone(now, timeZone));
  }

  if (/\btomorrow\b/.test(lower)) {
    return formatCivilDate(addDays(civilDateInZone(now, timeZone), 1));
  }

  const iso = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/);

  if (iso && parseCivilDate(iso[1])) {
    return iso[1];
  }

  const monthDay = new RegExp(
    `\\b(${MONTH_ALT})\\.?\\s*,?\\s*(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*,?\\s*(\\d{4}))?\\b`,
  );
  const dayMonth = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s*)?(${MONTH_ALT})\\.?(?:\\s*,?\\s*(\\d{4}))?\\b`,
  );

  const monthFirst = monthDay.exec(lower);
  const dayFirst = dayMonth.exec(lower);
  let month = 0;
  let day = 0;
  let year: number | undefined;

  if (monthFirst && dayFirst) {
    if (monthFirst.index <= dayFirst.index) {
      month = MONTH_BY_ALIAS.get(monthFirst[1]) ?? 0;
      day = Number(monthFirst[2]);
      year = monthFirst[3] ? Number(monthFirst[3]) : undefined;
    } else {
      month = MONTH_BY_ALIAS.get(dayFirst[2]) ?? 0;
      day = Number(dayFirst[1]);
      year = dayFirst[3] ? Number(dayFirst[3]) : undefined;
    }
  } else if (monthFirst) {
    month = MONTH_BY_ALIAS.get(monthFirst[1]) ?? 0;
    day = Number(monthFirst[2]);
    year = monthFirst[3] ? Number(monthFirst[3]) : undefined;
  } else if (dayFirst) {
    month = MONTH_BY_ALIAS.get(dayFirst[2]) ?? 0;
    day = Number(dayFirst[1]);
    year = dayFirst[3] ? Number(dayFirst[3]) : undefined;
  }

  if (!month || day < 1 || day > 31) {
    return undefined;
  }

  return resolveDiningDate({
    month,
    day,
    year,
    now,
    timeZone,
    rule: restaurant.rules[0],
  });
}

/**
 * Turn a month and day into a YYYY-MM-DD that is still watchable.
 *
 * If the dining date has already passed, or Minetta's booking window for it has
 * already opened, the year rolls forward so the preview countdown is live.
 */
export function resolveDiningDate({
  month,
  day,
  year,
  now,
  timeZone,
  rule,
}: {
  month: number;
  day: number;
  year?: number;
  now: Date;
  timeZone: string;
  rule?: RestaurantOption["rules"][number];
}): string | undefined {
  const today = civilDateInZone(now, timeZone);
  const startYear = year ?? today.year;

  for (let candidateYear = startYear; candidateYear <= startYear + 1; candidateYear += 1) {
    const iso = formatCivilDate({ year: candidateYear, month, day });

    if (!parseCivilDate(iso)) {
      return undefined;
    }

    if (!year && iso < formatCivilDate(today)) {
      continue;
    }

    if (rule) {
      try {
        const moment = computeDropMoment({ targetDate: iso, rule });

        if (moment.dropDatetime.getTime() <= now.getTime()) {
          if (year) {
            return iso;
          }

          continue;
        }
      } catch {
        return undefined;
      }
    }

    return iso;
  }

  return formatCivilDate({ year: startYear + 1, month, day });
}

function parseDemoParty(lower: string): number | undefined {
  const word = lower.match(
    new RegExp(
      `(?:for|party of|table for)\\s+(${Object.keys(WORD_PARTY).join("|")})\\b`,
    ),
  );

  if (word) {
    return WORD_PARTY[word[1]];
  }

  const numeric = lower.match(
    /(?:for|party of|table for)\s+(\d{1,2})\b|(\d{1,2})\s+(?:people|guests|pax)\b/,
  );

  if (!numeric) {
    return undefined;
  }

  const n = Number(numeric[1] || numeric[2]);

  if (!Number.isInteger(n) || n < 1 || n > MAX_PARTY_SIZE) {
    return undefined;
  }

  return n;
}

function parseDemoMeal(lower: string): Meal | undefined {
  if (/\bbreakfast\b/.test(lower)) {
    return Meal.BREAKFAST;
  }

  if (/\bbrunch\b/.test(lower)) {
    return Meal.BRUNCH;
  }

  if (/\blunch\b/.test(lower)) {
    return Meal.LUNCH;
  }

  if (/\b(?:dinner|supper)\b/.test(lower)) {
    return Meal.DINNER;
  }

  return undefined;
}
