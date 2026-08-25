"use client";

import { useActionState } from "react";

import { FormAlert, SelectField, SubmitButton } from "@/components/forms/fields";
import { updateTimezone } from "@/lib/auth/actions";

/**
 * One field: which IANA zone "your time" uses on My Watches.
 *
 * The options are the runtime's own timezone list, so a value chosen here is one
 * `Intl` already knows. The current zone is selected by default.
 */
export function TimezoneForm({
  timezone,
  timezones,
}: {
  timezone: string;
  timezones: string[];
}) {
  const [state, action, pending] = useActionState(updateTimezone, undefined);
  const options = timezones.map((zone) => ({ value: zone, label: zone }));

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.message && <FormAlert tone="error">{state.message}</FormAlert>}
      {state?.notice && <FormAlert tone="info">{state.notice}</FormAlert>}

      <SelectField
        label="Your timezone"
        name="timezone"
        options={options}
        defaultValue={timezone}
        hint="Drop times on My Watches are shown in this zone, next to New York time."
        errors={state?.errors?.timezone}
      />

      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save timezone
      </SubmitButton>
    </form>
  );
}
