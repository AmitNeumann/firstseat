"use client";

import { useActionState, useState } from "react";

import { FormAlert, SubmitButton } from "@/components/forms/fields";
import { DropPreview } from "@/components/watches/drop-preview";
import { WatchFieldset } from "@/components/watches/watch-fieldset";
import { updateWatch } from "@/lib/watches/actions";
import { restaurantLabel, summariseRules } from "@/lib/watches/options";
import type { EditableWatch } from "@/lib/watches/queries";

export function EditWatchForm({
  watch,
  earliestDate,
  latestDate,
  timezone,
}: {
  watch: EditableWatch;
  earliestDate: string;
  latestDate: string;
  timezone: string;
}) {
  const [state, action, pending] = useActionState(updateWatch, undefined);
  const [targetDate, setTargetDate] = useState(watch.targetDate);

  return (
    <form action={action} className="space-y-5">
      {/*
        The server does not trust this. It looks the watch up scoped by the signed-in
        user's id, so editing the value here just produces "that watch no longer exists".
      */}
      <input type="hidden" name="watchId" value={watch.id} />

      {state?.message && (
        <FormAlert tone="error">
          <p>{state.message}</p>
          {state.bookingUrl && (
            <a
              href={state.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-medium underline underline-offset-2"
            >
              Book it directly
            </a>
          )}
        </FormAlert>
      )}

      <div className="space-y-1.5">
        <p className="block text-sm font-medium">Restaurant</p>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-sm font-medium">{restaurantLabel(watch.restaurant)}</p>
          <p className="text-xs text-muted">{summariseRules(watch.restaurant.rules)}</p>
        </div>
        <p className="text-xs text-muted">
          To watch a different restaurant, create a new watch.
        </p>
      </div>

      <WatchFieldset
        earliestDate={earliestDate}
        latestDate={latestDate}
        defaults={{
          targetDate: state?.values?.targetDate ?? watch.targetDate,
          partySize: state?.values?.partySize ?? String(watch.partySize),
          meal: state?.values?.meal ?? watch.meal,
        }}
        errors={state?.errors}
        onTargetDateChange={setTargetDate}
      />

      <DropPreview
        restaurant={watch.restaurant}
        targetDate={targetDate}
        userZone={timezone}
      />

      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save changes
      </SubmitButton>

      <p className="text-xs text-muted">
        Changing the date reschedules the alert for the new drop moment.
      </p>
    </form>
  );
}
