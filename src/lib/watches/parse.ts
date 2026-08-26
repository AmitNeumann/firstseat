/**
 * Turn a model's JSON into a watch *proposal*.
 *
 * The model is untrusted: it can invent a restaurant, a 400-person party, or a date in
 * 1987. This module never talks to Prisma. It checks the shape with Zod, resolves the
 * restaurant name against the list we already loaded, and returns fields the create form
 * can pre-fill or confirm in one click. `createWatch` is still the only thing that writes a row.
 */

import * as z from "zod";

import { Meal } from "@/generated/prisma/enums";
import { CIVIL_DATE_PATTERN, parseCivilDate } from "@/lib/time";
import { formatMediumDate, MEAL_LABELS } from "@/lib/watches/format";
import {
  filterRestaurants,
  normaliseForSearch,
  type RestaurantOption,
} from "@/lib/watches/options";
import { MAX_PARTY_SIZE } from "@/lib/watches/schemas";
import { PARSE_MAX_CHARS } from "@/lib/watches/parse-limits";

export { PARSE_MAX_CHARS };

export type WatchProposal = {
  restaurantId: string;
  restaurantName: string;
  targetDate?: string;
  partySize?: number;
  meal?: Meal;
};

export type ParseOutcome =
  | { ok: true; proposal: WatchProposal }
  | { ok: false; error: string };

/** True when one-click create can submit every field `createWatch` requires. */
export function isCompleteProposal(
  proposal: WatchProposal,
): proposal is WatchProposal & {
  targetDate: string;
  partySize: number;
  meal: Meal;
} {
  return (
    Boolean(proposal.targetDate) &&
    proposal.partySize !== undefined &&
    Boolean(proposal.meal)
  );
}

/** "Minetta Tavern · 29 Sep 2026 · Dinner · Party of 2" — skips anything missing. */
export function summariseProposal(proposal: WatchProposal): string {
  const parts = [proposal.restaurantName];

  if (proposal.targetDate) {
    parts.push(formatMediumDate(proposal.targetDate));
  }

  if (proposal.meal) {
    parts.push(MEAL_LABELS[proposal.meal]);
  }

  if (proposal.partySize !== undefined) {
    parts.push(proposal.partySize === 1 ? "Party of 1" : `Party of ${proposal.partySize}`);
  }

  return parts.join(" · ");
}

/**
 * What the model is asked to return. Extra keys are ignored; missing optional fields are
 * treated as "the sentence did not mention this".
 */
export const ModelJsonSchema = z.object({
  restaurant: z.union([z.string(), z.null()]).optional(),
  date: z.union([z.string(), z.null()]).optional(),
  partySize: z.union([z.number(), z.string(), z.null()]).optional(),
  meal: z.union([z.string(), z.null()]).optional(),
});

export type ModelJson = z.infer<typeof ModelJsonSchema>;

export type RestaurantResolve =
  | { status: "matched"; restaurant: RestaurantOption }
  | { status: "none" }
  | { status: "ambiguous" };

/**
 * Map a free-text restaurant name onto one seeded row.
 *
 * Matching is a name problem, not a city problem: "New York" would otherwise hit every
 * restaurant we track. Zero name matches means we do not invent a row. Several name
 * matches means the diner should pick from the list rather than us guessing.
 */
export function resolveRestaurantName(
  restaurants: RestaurantOption[],
  rawName: string,
): RestaurantResolve {
  const query = rawName.trim();

  if (!query) {
    return { status: "none" };
  }

  const matches = filterRestaurants(restaurants, query);
  const byName = matches.filter((restaurant) => {
    const words = normaliseForSearch(query).split(/\s+/).filter(Boolean);
    const haystack = normaliseForSearch(restaurant.name);
    return words.every((word) => haystack.includes(word));
  });

  if (byName.length === 0) {
    return { status: "none" };
  }

  const exact = byName.filter(
    (restaurant) => normaliseForSearch(restaurant.name) === normaliseForSearch(query),
  );

  if (exact.length === 1) {
    return { status: "matched", restaurant: exact[0] };
  }

  if (byName.length === 1) {
    return { status: "matched", restaurant: byName[0] };
  }

  return { status: "ambiguous" };
}

/**
 * Validate model JSON and resolve it against restaurants we actually track.
 *
 * `earliestDate` / `latestDate` are the same bounds the create form uses (the diner's
 * timezone). An out-of-range date is dropped rather than failing the whole proposal —
 * the restaurant fill is still useful, and the diner can pick a date themselves.
 */
export function proposeWatchFields({
  model,
  restaurants,
  earliestDate,
  latestDate,
}: {
  model: unknown;
  restaurants: RestaurantOption[];
  earliestDate: string;
  latestDate: string;
}): ParseOutcome {
  const parsed = ModelJsonSchema.safeParse(model);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Couldn't read that just now. Fill the form below instead.",
    };
  }

  const restaurantName = (parsed.data.restaurant ?? "").trim();
  const resolved = resolveRestaurantName(restaurants, restaurantName);

  if (resolved.status === "none") {
    return {
      ok: false,
      error: restaurantName
        ? "We don't track that restaurant yet. Pick one from the list below."
        : "Couldn't tell which restaurant you meant. Pick one from the list below.",
    };
  }

  if (resolved.status === "ambiguous") {
    return {
      ok: false,
      error: "That could be more than one restaurant — pick it from the list below.",
    };
  }

  const proposal: WatchProposal = {
    restaurantId: resolved.restaurant.id,
    restaurantName: resolved.restaurant.name,
  };

  const date = sanitiseDate(parsed.data.date, earliestDate, latestDate);
  if (date) {
    proposal.targetDate = date;
  }

  const partySize = sanitisePartySize(parsed.data.partySize);
  if (partySize !== undefined) {
    proposal.partySize = partySize;
  }

  const meal = sanitiseMeal(parsed.data.meal);
  if (meal) {
    proposal.meal = meal;
  }

  return { ok: true, proposal };
}

function sanitiseDate(
  value: string | null | undefined,
  earliestDate: string,
  latestDate: string,
): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!CIVIL_DATE_PATTERN.test(trimmed) || parseCivilDate(trimmed) === null) {
    return undefined;
  }

  if (trimmed < earliestDate || trimmed > latestDate) {
    return undefined;
  }

  return trimmed;
}

function sanitisePartySize(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const n = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(n) || n < 1 || n > MAX_PARTY_SIZE) {
    return undefined;
  }

  return n;
}

function sanitiseMeal(value: string | null | undefined): Meal | undefined {
  if (!value) {
    return undefined;
  }

  const candidate = value.trim().toUpperCase();

  if (
    candidate === Meal.BREAKFAST ||
    candidate === Meal.BRUNCH ||
    candidate === Meal.LUNCH ||
    candidate === Meal.DINNER
  ) {
    return candidate;
  }

  return undefined;
}
