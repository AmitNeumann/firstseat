"use client";

import { useActionState } from "react";

import { PasswordField } from "@/components/auth/form-fields";
import { FormAlert, SubmitButton } from "@/components/forms/fields";
import { updatePassword } from "@/lib/auth/actions";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);

  return (
    <form action={action} className="flex flex-col gap-3.5">
      {state?.message && <FormAlert tone="error">{state.message}</FormAlert>}

      <PasswordField
        label="New password"
        name="password"
        autoComplete="new-password"
        placeholder="••••••••"
        hint="At least 8 characters."
        errors={state?.errors?.password}
      />

      <PasswordField
        label="Confirm password"
        name="confirmPassword"
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
