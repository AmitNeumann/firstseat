"use client";

import { useActionState } from "react";

import { Field } from "@/components/auth/form-fields";
import { FormAlert, SubmitButton } from "@/components/forms/fields";
import { requestPasswordReset } from "@/lib/auth/actions";

export function ForgotPasswordForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);

  if (state?.notice) {
    return <FormAlert tone="info">{state.notice}</FormAlert>;
  }

  return (
    <form action={action} className="flex flex-col gap-3.5">
      {state?.message && <FormAlert tone="error">{state.message}</FormAlert>}
      {!state && notice && <FormAlert tone="error">{notice}</FormAlert>}

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        defaultValue={state?.email}
        errors={state?.errors?.email}
      />

      <SubmitButton pending={pending} pendingLabel="Sending link…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
