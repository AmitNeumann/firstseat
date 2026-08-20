"use client";

import { useActionState } from "react";

import { login } from "@/lib/auth/actions";
import { Field, FormAlert, SubmitButton } from "@/components/auth/form-fields";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-4" noValidate={false}>
      {state?.message && <FormAlert tone="error">{state.message}</FormAlert>}
      {!state && notice && <FormAlert tone="error">{notice}</FormAlert>}

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state?.email}
        errors={state?.errors?.email}
      />

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        errors={state?.errors?.password}
      />

      <SubmitButton pending={pending} pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
