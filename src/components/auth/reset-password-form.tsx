"use client";

import { useActionState } from "react";

import { Field } from "@/components/auth/form-fields";
import { FormAlert, SubmitButton } from "@/components/forms/fields";
import { updatePassword } from "@/lib/auth/actions";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);

  return (
    <form action={action} className="flex flex-col gap-3.5">
      {state?.message && <FormAlert tone="error">{state.message}</FormAlert>}

      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        hint="At least 8 characters."
        errors={state?.errors?.password}
      />

      <Field
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        errors={state?.errors?.confirmPassword}
      />

      <SubmitButton pending={pending} pendingLabel="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}
