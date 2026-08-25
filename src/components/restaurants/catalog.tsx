"use client";

import { useState } from "react";

import { RestaurantCard } from "@/components/restaurants/restaurant-card";
import {
  catalogPills,
  filterCatalog,
  type CatalogFilterId,
  type RestaurantOption,
} from "@/lib/watches/options";

/**
 * Search + chips + the card grid.
 *
 * Filtering is a Client Component so typing does not round-trip to the server. The
 * restaurant list itself is still loaded on the server and passed in — this never
 * fetches.
 */
export function RestaurantCatalog({ restaurants }: { restaurants: RestaurantOption[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CatalogFilterId>("all");
  const pills = catalogPills(restaurants);
  const matches = filterCatalog(restaurants, query, filter);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name…"
          aria-label="Search by name"
          className="min-w-[200px] flex-1 rounded-[11px] border border-border bg-card
                     px-3.5 py-3 text-[15px] text-foreground outline-none
                     placeholder:text-placeholder"
        />

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter restaurants">
          {pills.map((pill) => {
            const active = pill.id === filter;

            return (
              <button
                key={pill.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(pill.id)}
                className={
                  active
                    ? "rounded-full bg-clay px-3.5 py-2 text-[13px] font-semibold text-cream-on-clay"
                    : "rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-soft hover:border-honey-border hover:bg-honey-light"
                }
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {matches.length === 0 ? (
        <p className="rounded-panel border border-border bg-card px-[18px] py-[30px] text-center text-[13.5px] text-muted">
          {emptyCopy(query, filter)}
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
          {matches.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      )}
    </div>
  );
}

function emptyCopy(query: string, filter: CatalogFilterId): string {
  const trimmed = query.trim();

  if (trimmed) {
    return `Nothing matches “${trimmed}”. Tell us the room and we'll add it.`;
  }

  if (filter === "midnight") {
    return "Nothing matches this filter. Tell us the room and we'll add it.";
  }

  if (filter.startsWith("platform:")) {
    return "Nothing matches this filter. Tell us the room and we'll add it.";
  }

  return "Nothing matches. Tell us the room and we'll add it.";
}
