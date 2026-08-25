"use client";

import { useActionState } from "react";

import { FormAlert, SelectField, SubmitButton, TextField } from "@/components/forms/fields";
import { updateSettings } from "@/lib/auth/actions";

/**
 * The one Settings card: names, the sign-in email (read-only), and timezone.
 */
export function ProfileForm({
  firstName,
  lastName,
  email,
  timezone,
  timezones,
}: {
  firstName: string | null;
  lastName: string | null;
  email: string;
  timezone: string;
  timezones: string[];
}) {
  const [state, action, pending] = useActionState(updateSettings, undefined);
  const options = timezones.map((zone) => ({ value: zone, label: zone }));

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.message && <FormAlert tone="error">{state.message}</FormAlert>}
      {state?.notice && <FormAlert tone="info">{state.notice}</FormAlert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="First name"
          name="firstName"
          defaultValue={firstName ?? ""}
          autoComplete="given-name"
          placeholder="Amit"
          errors={state?.errors?.firstName}
          maxLength={40}
        />
        <TextField
          label="Last name"
          name="lastName"
          defaultValue={lastName ?? ""}
          autoComplete="family-name"
          placeholder="Neumann"
          errors={state?.errors?.lastName}
          maxLength={40}
        />
      </div>

      <div className="space-y-1.5">
        <p className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Email
        </p>
        <p
          className="rounded-control border border-border bg-background px-3.5 py-3
                     text-[15px] text-foreground"
        >
          {email}
        </p>
      </div>

      <SelectField
        label="Timezone"
        name="timezone"
        options={options}
        defaultValue={timezone}
        errors={state?.errors?.timezone}
      />

      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save
      </SubmitButton>
    </form>
  );
}
