"use client";

import { useActionState, useState } from "react";

import { FormAlert, SubmitButton } from "@/components/forms/fields";
import { DropPreview } from "@/components/watches/drop-preview";
import { RestaurantPicker } from "@/components/watches/restaurant-picker";
import { WatchFieldset } from "@/components/watches/watch-fieldset";
import { createWatch } from "@/lib/watches/actions";
import type { RestaurantOption } from "@/lib/watches/options";

export function CreateWatchForm({
  restaurants,
  earliestDate,
  latestDate,
  timezone,
}: {
  restaurants: RestaurantOption[];
  earliestDate: string;
  latestDate: string;
  /** The user's timezone, so drop times can be shown on their own clock. */
  timezone: string;
}) {
  const [state, action, pending] = useActionState(createWatch, undefined);

  // Held here rather than read out of the DOM so the preview below can recompute as the
  // user changes either one. The values submitted are still the inputs' own, so a failed
  // submit does not lose anything.
  const [restaurant, setRestaurant] = useState<RestaurantOption | null>(null);
  const [targetDate, setTargetDate] = useState("");

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

      <RestaurantPicker
        label="Restaurant"
        name="restaurantId"
        restaurants={restaurants}
        value={restaurant?.id ?? null}
        onChange={setRestaurant}
        errors={state?.errors?.restaurantId}
      />

      <WatchFieldset
        earliestDate={earliestDate}
        latestDate={latestDate}
        defaults={state?.values ?? {}}
        errors={state?.errors}
        onTargetDateChange={setTargetDate}
      />

      <DropPreview restaurant={restaurant} targetDate={targetDate} userZone={timezone} />

      <SubmitButton pending={pending} pendingLabel="Working out the drop time…">
        Create watch
      </SubmitButton>

      <p className="text-xs text-muted">
        Restaurants release tables on their own local clock. We convert that to your
        timezone ({timezone}) and alert you a few minutes before.
      </p>
    </form>
  );
}
