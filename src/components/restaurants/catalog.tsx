"use client";

import { useId, useState } from "react";

import { RestaurantCard } from "@/components/restaurants/restaurant-card";
import {
  catalogCards,
  catalogPills,
  filterRestaurants,
  type CatalogFilterId,
  type CatalogSelection,
  type RestaurantOption,
} from "@/lib/watches/options";

/**
 * Search + chips + the card grid.
 *
 * The autocomplete lives in a child so its typed text cannot reach the grid. The grid
 * only re-filters when that child commits (Enter or a suggestion) or clears.
 */
export function RestaurantCatalog({ restaurants }: { restaurants: RestaurantOption[] }) {
  const [filter, setFilter] = useState<CatalogFilterId>("all");
  const [selection, setSelection] = useState<CatalogSelection>({ kind: "all" });
  const pills = catalogPills(restaurants);
  const matches = catalogCards(restaurants, selection, filter);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <CatalogSearch restaurants={restaurants} onSelect={setSelection} />

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
          {emptyCopy(selection, filter, restaurants)}
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

function CatalogSearch({
  restaurants,
  onSelect,
}: {
  restaurants: RestaurantOption[];
  onSelect: (selection: CatalogSelection) => void;
}) {
  const listboxId = useId();
  const [draft, setDraft] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const suggestions = draft.trim() ? filterRestaurants(restaurants, draft) : [];
  const activeIndex = Math.min(highlighted, Math.max(suggestions.length - 1, 0));
  const showList = isOpen && draft.trim().length > 0;

  function commitRestaurant(restaurant: RestaurantOption): void {
    setDraft(restaurant.name);
    setIsOpen(false);
    setHighlighted(0);
    onSelect({ kind: "restaurant", id: restaurant.id });
  }

  function commitDraft(): void {
    const trimmed = draft.trim();

    if (!trimmed) {
      setIsOpen(false);
      onSelect({ kind: "all" });
      return;
    }

    if (suggestions[activeIndex]) {
      commitRestaurant(suggestions[activeIndex]);
      return;
    }

    onSelect({ kind: "query", query: trimmed });
    setIsOpen(false);
  }

  function handleType(text: string): void {
    setDraft(text);
    setHighlighted(0);

    if (!text.trim()) {
      setIsOpen(false);
      onSelect({ kind: "all" });
      return;
    }

    setIsOpen(true);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();

      if (!showList && draft.trim()) {
        setIsOpen(true);
        return;
      }

      const step = event.key === "ArrowDown" ? 1 : -1;
      const next =
        (activeIndex + step + suggestions.length) % Math.max(suggestions.length, 1);
      setHighlighted(next);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  function handleBlur(event: React.FocusEvent<HTMLDivElement>): void {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsOpen(false);
    }
  }

  return (
    <div className="relative min-w-[200px] flex-1" onBlur={handleBlur}>
      <input
        type="text"
        value={draft}
        onChange={(event) => handleType(event.target.value)}
        onFocus={() => {
          if (draft.trim()) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search by name…"
        aria-label="Search by name"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && suggestions[activeIndex] ? `${listboxId}-${activeIndex}` : undefined
        }
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="w-full rounded-[11px] border border-border bg-card
                   px-3.5 py-3 text-[15px] text-foreground outline-none
                   placeholder:text-placeholder"
      />

      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border
                     border-border bg-card py-1 shadow-lg"
        >
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">
              No restaurant matches “{draft.trim()}”.
            </li>
          ) : (
            suggestions.map((restaurant, index) => (
              <li
                key={restaurant.id}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => {
                  event.preventDefault();
                  commitRestaurant(restaurant);
                }}
                onMouseEnter={() => setHighlighted(index)}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  index === activeIndex ? "bg-accent/10" : ""
                }`}
              >
                <span className="block font-medium">{restaurant.name}</span>
                <span className="block text-xs text-muted">{restaurant.city}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function emptyCopy(
  selection: CatalogSelection,
  filter: CatalogFilterId,
  restaurants: RestaurantOption[],
): string {
  const chosen =
    selection.kind === "restaurant"
      ? restaurants.find((restaurant) => restaurant.id === selection.id)?.name
      : selection.kind === "query"
        ? selection.query
        : undefined;
  const trimmed = chosen?.trim() ?? "";

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
