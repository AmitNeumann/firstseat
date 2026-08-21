"use client";

import { useId, useState } from "react";

import { FieldShell } from "@/components/forms/fields";
import {
  filterRestaurants,
  restaurantLabel,
  summariseRules,
  type RestaurantOption,
} from "@/lib/watches/options";

/**
 * Type-to-search restaurant picker.
 *
 * A plain `<select>` stops being usable somewhere around thirty options, which is exactly
 * the size the seeded list is heading for. This lets the user type and narrows the list as
 * they go.
 *
 * The rule it is built around: **typing is not choosing.** The value actually submitted
 * lives in a hidden input and is only ever set by picking an entry from the list, so a
 * restaurant we do not have a release rule for cannot be submitted no matter what is typed
 * into the box. Typing again clears the selection, which is what stops the box reading
 * "Carbone" while the form quietly still holds the id of something else.
 *
 * None of this is a security control — the browser can be made to send anything. The
 * server re-checks that the id exists before it writes. This is here so the interface
 * cannot mislead an honest user.
 */
export function RestaurantPicker({
  name,
  label,
  restaurants,
  value,
  onChange,
  errors,
}: {
  name: string;
  label: string;
  restaurants: RestaurantOption[];
  /** The chosen restaurant's id, or `null` while nothing is chosen. */
  value: string | null;
  onChange: (restaurant: RestaurantOption | null) => void;
  errors?: string[];
}) {
  const listboxId = useId();
  const selected = restaurants.find((restaurant) => restaurant.id === value) ?? null;

  const [query, setQuery] = useState(() => (selected ? restaurantLabel(selected) : ""));
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  // While something is selected the box shows its full label, so filtering by that text
  // would narrow the list to one entry and make it look like the others had vanished.
  const matches =
    selected && query === restaurantLabel(selected)
      ? restaurants
      : filterRestaurants(restaurants, query);

  // Clamped rather than stored blindly: the list shrinks as the user types, and the
  // highlight must not point past the end of it.
  const activeIndex = Math.min(highlighted, Math.max(matches.length - 1, 0));

  function choose(restaurant: RestaurantOption): void {
    setQuery(restaurantLabel(restaurant));
    setIsOpen(false);
    setHighlighted(0);
    onChange(restaurant);
  }

  function handleType(text: string): void {
    setQuery(text);
    setIsOpen(true);
    setHighlighted(0);

    // Editing the text means the previous choice no longer matches what is on screen.
    if (selected) {
      onChange(null);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      // Otherwise the caret jumps to the start or end of the text.
      event.preventDefault();

      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = (activeIndex + step + matches.length) % Math.max(matches.length, 1);
      setHighlighted(next);
      return;
    }

    if (event.key === "Enter" && isOpen && matches[activeIndex]) {
      // Enter picks the highlighted restaurant rather than submitting a form the user has
      // not finished filling in.
      event.preventDefault();
      choose(matches[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  function handleBlur(event: React.FocusEvent<HTMLDivElement>): void {
    // Closing on the input's own blur would fire before a click on an option registers.
    // Checking whether focus stayed inside the wrapper lets the click land first.
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsOpen(false);
    }
  }

  return (
    <FieldShell
      label={label}
      name={name}
      hint="Only restaurants whose release schedule we have confirmed."
      errors={errors}
    >
      {(props) => (
        <div className="relative" onBlur={handleBlur}>
          {/* What the form actually submits. Set only by choosing from the list. */}
          <input type="hidden" name={name} value={value ?? ""} />

          <input
            {...props}
            type="text"
            autoComplete="off"
            placeholder="Start typing a restaurant name"
            value={query}
            onChange={(event) => handleType(event.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              isOpen && matches[activeIndex] ? `${listboxId}-${activeIndex}` : undefined
            }
          />

          {isOpen && (
            <ul
              id={listboxId}
              role="listbox"
              className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border
                         border-border bg-card py-1 shadow-lg"
            >
              {matches.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted">
                  No restaurant matches “{query}”. We only track restaurants whose release
                  schedule we have confirmed.
                </li>
              ) : (
                matches.map((restaurant, index) => (
                  <li
                    key={restaurant.id}
                    id={`${listboxId}-${index}`}
                    role="option"
                    aria-selected={restaurant.id === value}
                    // onMouseDown, not onClick: mousedown happens before the input loses
                    // focus, so the option is still on screen when the press lands.
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(restaurant);
                    }}
                    onMouseEnter={() => setHighlighted(index)}
                    className={`cursor-pointer px-3 py-2 text-sm ${
                      index === activeIndex ? "bg-accent/10" : ""
                    }`}
                  >
                    <span className="block font-medium">{restaurantLabel(restaurant)}</span>
                    <span className="block text-xs text-muted">
                      {summariseRules(restaurant.rules)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </FieldShell>
  );
}
