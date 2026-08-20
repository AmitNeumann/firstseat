"use client";

import { useActionState } from "react";

import {
  DateField,
  FormAlert,
  SelectField,
  SubmitButton,
  type SelectOption,
} from "@/components/forms/fields";
import { Meal } from "@/generated/prisma/enums";
import { MEAL_LABELS } from "@/lib/watches/format";
import { createWatch } from "@/lib/watches/actions";
import { MAX_PARTY_SIZE } from "@/lib/watches/schemas";

export type RestaurantOption = {
  id: string;
  name: string;
  /** e.g. "Resy · 30 days ahead", shown so the user can see what we know. */
  ruleSummary: string;
};

/** Party sizes offered in the dropdown. Larger groups are usually phone-only. */
const PARTY_SIZES = Array.from({ length: 12 }, (_, index) => index + 1);

const mealOptions: SelectOption[] = Object.values(Meal).map((meal) => ({
  value: meal,
  label: MEAL_LABELS[meal],
}));

const partySizeOptions: SelectOption[] = PARTY_SIZES.map((size) => ({
  value: String(size),
  label: size === 1 ? "1 person" : `${size} people`,
}));

export function WatchForm({
  restaurants,
  earliestDate,
  latestDate,
  timezone,
}: {
  restaurants: RestaurantOption[];
  /** "YYYY-MM-DD" bounds for the date picker. Convenience only; the server re-checks. */
  earliestDate: string;
  latestDate: string;
  /** The user's timezone, so the form can say which clock the alert will follow. */
  timezone: string;
}) {
  const [state, action, pending] = useActionState(createWatch, undefined);

  const restaurantOptions: SelectOption[] = restaurants.map((restaurant) => ({
    value: restaurant.id,
    label: `${restaurant.name} — ${restaurant.ruleSummary}`,
  }));

  return (
    <form action={action} className="space-y-5">
      {state?.message && (
        <FormAlert tone="error">
          <p>{state.message}</p>
          {state.bookingUrl && (
            <a
              href={state.bookingUrl}
              target="_blank"
              // noreferrer as well as noopener: the target page should not learn which
              // page sent the user, and cannot get a handle on this window.
              rel="noopener noreferrer"
              className="inline-block font-medium underline underline-offset-2"
            >
              Book it directly
            </a>
          )}
        </FormAlert>
      )}

      <SelectField
        label="Restaurant"
        name="restaurantId"
        options={restaurantOptions}
        placeholder="Choose a restaurant"
        defaultValue={state?.values?.restaurantId}
        hint="Only restaurants whose release schedule we have confirmed."
        errors={state?.errors?.restaurantId}
      />

      <DateField
        label="Date you want to eat"
        name="targetDate"
        min={earliestDate}
        max={latestDate}
        defaultValue={state?.values?.targetDate}
        errors={state?.errors?.targetDate}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Party size"
          name="partySize"
          options={partySizeOptions}
          placeholder="How many?"
          defaultValue={state?.values?.partySize}
          hint={`Up to ${MAX_PARTY_SIZE}; call the restaurant for more.`}
          errors={state?.errors?.partySize}
        />

        <SelectField
          label="Meal"
          name="meal"
          options={mealOptions}
          placeholder="Which meal?"
          defaultValue={state?.values?.meal}
          errors={state?.errors?.meal}
        />
      </div>

      <SubmitButton pending={pending} pendingLabel="Working out the drop time…">
        Create watch
      </SubmitButton>

      <p className="text-xs text-muted">
        We will work out the exact moment that table is released and alert you a few
        minutes before, in {timezone}.
      </p>
    </form>
  );
}
