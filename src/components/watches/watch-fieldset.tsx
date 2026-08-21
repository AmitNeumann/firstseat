"use client";

import { DateField, SelectField, type SelectOption } from "@/components/forms/fields";
import { Meal } from "@/generated/prisma/enums";
import { MEAL_LABELS } from "@/lib/watches/format";
import type { WatchFormState } from "@/lib/watches/schemas";

/**
 * The three fields that describe the table itself: date, party size, meal.
 *
 * Shared by the create and edit forms so the two cannot drift apart — a rule added to one
 * would otherwise quietly not apply to the other.
 */

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

export function WatchFieldset({
  earliestDate,
  latestDate,
  defaults,
  errors,
  onTargetDateChange,
}: {
  /** "YYYY-MM-DD" bounds for the date picker. Convenience only; the server re-checks. */
  earliestDate: string;
  latestDate: string;
  defaults: { targetDate?: string; partySize?: string; meal?: string };
  errors: NonNullable<WatchFormState>["errors"];
  onTargetDateChange: (value: string) => void;
}) {
  return (
    <>
      <DateField
        label="Date you want to eat"
        name="targetDate"
        min={earliestDate}
        max={latestDate}
        defaultValue={defaults.targetDate}
        errors={errors?.targetDate}
        onChange={onTargetDateChange}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Party size"
          name="partySize"
          options={partySizeOptions}
          placeholder="How many?"
          defaultValue={defaults.partySize}
          errors={errors?.partySize}
        />

        <SelectField
          label="Meal"
          name="meal"
          options={mealOptions}
          placeholder="Which meal?"
          defaultValue={defaults.meal}
          errors={errors?.meal}
        />
      </div>
    </>
  );
}
