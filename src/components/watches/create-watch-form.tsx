"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/forms/fields";
import { DropPreview } from "@/components/watches/drop-preview";
import { RestaurantPicker } from "@/components/watches/restaurant-picker";
import { WatchFieldset } from "@/components/watches/watch-fieldset";
import { WatchFormMessage } from "@/components/watches/watch-form-message";
import { createWatch } from "@/lib/watches/actions";
import { DEFAULT_ALERT_LEAD_MINUTES } from "@/lib/watches/drop-time";
import type { RestaurantOption } from "@/lib/watches/options";

export function CreateWatchForm({
  restaurants,
  earliestDate,
  latestDate,
  timezone,
  initialRestaurantId,
}: {
  restaurants: RestaurantOption[];
  earliestDate: string;
  latestDate: string;
  /** The user's timezone, so drop times can be shown on their own clock. */
  timezone: string;
  /** Set when the catalog (or a bookmark) already chose the restaurant. */
  initialRestaurantId?: string;
}) {
  const [state, action, pending] = useActionState(createWatch, undefined);

  // Held here rather than read out of the DOM so the preview below can recompute as the
  // user changes either one. The values submitted are still the inputs' own, so a failed
  // submit does not lose anything.
  const [restaurant, setRestaurant] = useState<RestaurantOption | null>(
    () => restaurants.find((entry) => entry.id === initialRestaurantId) ?? null,
  );
  const [targetDate, setTargetDate] = useState("");

  return (
    <form action={action} className="space-y-5">
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

      <WatchFormMessage state={state} />

      <SubmitButton pending={pending} pendingLabel="Working out the drop time…">
        Create watch
      </SubmitButton>

      <p className="text-xs text-muted">
        Restaurants release tables on their own local clock. We convert that to your
        timezone ({timezone}) and alert you {DEFAULT_ALERT_LEAD_MINUTES} minutes before.
      </p>
    </form>
  );
}
