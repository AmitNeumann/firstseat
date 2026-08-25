"use client";

import { useActionState } from "react";

import { FormAlert, SubmitButton, TextField } from "@/components/forms/fields";
import { updateName } from "@/lib/auth/actions";

/**
 * First and last name. Empty fields store null, so the avatar falls back to the email
 * letter and My Watches does not greet a blank name.
 */
export function NameForm({
  firstName,
  lastName,
}: {
  firstName: string | null;
  lastName: string | null;
}) {
  const [state, action, pending] = useActionState(updateName, undefined);

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

      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save name
      </SubmitButton>
    </form>
  );
}
