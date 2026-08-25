/**
 * The restaurant list as the form needs it, plus the matching rule behind the
 * type-to-search box.
 *
 * Kept separate from the components so the matching logic is a plain function that can be
 * unit tested, rather than something you can only exercise by rendering a combobox and
 * typing into it.
 */

import { platformLabel } from "@/lib/watches/platforms";

export type RestaurantRuleOption = {
  /** A validated lowercase slug, e.g. "resy" or "sevenrooms". */
  platform: string;
  daysInAdvance: number;
  /** Wall-clock "HH:MM" in `timezone`. */
  releaseTime: string;
  timezone: string;
};

export type RestaurantOption = {
  id: string;
  name: string;
  city: string;
  /** App path under `public/`, e.g. `/restaurants/minetta-tavern.jpg`. */
  imageUrl?: string | null;
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

/**
 * Catalog chips: All, each platform actually present, and "Drops at midnight" when
 * anyone releases at 00:00.
 *
 * The design file also had Tock and Downtown. We do not invent those: there is no Tock
 * restaurant in the seed, and the schema stores city, not neighborhood.
 */
export type CatalogFilterId = "all" | "midnight" | `platform:${string}`;

export type CatalogPill = {
  id: CatalogFilterId;
  label: string;
};

const PLATFORM_PILL_ORDER = ["resy", "tock", "opentable", "doordash"];

export function catalogPills(restaurants: RestaurantOption[]): CatalogPill[] {
  const slugs = [
    ...new Set(
      restaurants.flatMap((restaurant) => restaurant.rules.map((rule) => rule.platform)),
    ),
  ];
  slugs.sort((a, b) => {
    const aRank = PLATFORM_PILL_ORDER.indexOf(a);
    const bRank = PLATFORM_PILL_ORDER.indexOf(b);
    if (aRank === -1 && bRank === -1) {
      return platformLabel(a).localeCompare(platformLabel(b));
    }
    if (aRank === -1) {
      return 1;
    }
    if (bRank === -1) {
      return -1;
    }
    return aRank - bRank;
  });

  const pills: CatalogPill[] = [
    { id: "all", label: "All" },
    ...slugs.map((slug) => ({
      id: `platform:${slug}` as const,
      label: platformLabel(slug),
    })),
  ];

  if (restaurants.some((restaurant) => restaurant.rules.some(isMidnightDrop))) {
    pills.push({ id: "midnight", label: "Drops at midnight" });
  }

  return pills;
}

export function isMidnightDrop(rule: RestaurantRuleOption): boolean {
  return rule.releaseTime === "00:00";
}

/** Search, then the active catalog chip. */
export function filterCatalog(
  restaurants: RestaurantOption[],
  query: string,
  filter: CatalogFilterId,
): RestaurantOption[] {
  return filterRestaurants(restaurants, query).filter((restaurant) =>
    matchesCatalogFilter(restaurant, filter),
  );
}

/**
 * What the catalog *grid* shows. The search box's live text is not this — typing only
 * drives suggestions until Enter or a pick commits a selection.
 */
export type CatalogSelection =
  | { kind: "all" }
  | { kind: "restaurant"; id: string }
  | { kind: "query"; query: string };

export function catalogCards(
  restaurants: RestaurantOption[],
  selection: CatalogSelection,
  filter: CatalogFilterId,
): RestaurantOption[] {
  if (selection.kind === "restaurant") {
    return filterCatalog(restaurants, "", filter).filter(
      (restaurant) => restaurant.id === selection.id,
    );
  }

  if (selection.kind === "query") {
    return filterCatalog(restaurants, selection.query, filter);
  }

  return filterCatalog(restaurants, "", filter);
}

export function matchesCatalogFilter(
  restaurant: RestaurantOption,
  filter: CatalogFilterId,
): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "midnight") {
    return restaurant.rules.some(isMidnightDrop);
  }

  const slug = filter.slice("platform:".length);
  return restaurant.rules.some((rule) => rule.platform === slug);
}

/** `/watches/new` with this restaurant already chosen. */
export function watchCreationPath(restaurantId: string): string {
  return `/watches/new?restaurantId=${encodeURIComponent(restaurantId)}`;
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
    .map((rule) => `${platformLabel(rule.platform)} · ${rule.daysInAdvance} days ahead`)
    .join(" / ");
}

/**
 * Catalog-card schedule line: "Releases 30 days ahead, 00:00 ET".
 *
 * New York is written "ET" because that is how the rooms themselves quote the hour.
 * Any other zone falls back to the city in the IANA name rather than guessing an
 * abbreviation we have not looked up.
 */
export function describeReleaseSchedule(rules: RestaurantRuleOption[]): string {
  return rules
    .map((rule) => {
      const clock = clockAbbrev(rule.timezone);
      return `Releases ${rule.daysInAdvance} days ahead, ${rule.releaseTime} ${clock}`;
    })
    .join(" / ");
}

function clockAbbrev(timezone: string): string {
  if (timezone === "America/New_York") {
    return "ET";
  }

  const place = timezone.split("/").at(-1) ?? timezone;
  return place.replaceAll("_", " ");
}
