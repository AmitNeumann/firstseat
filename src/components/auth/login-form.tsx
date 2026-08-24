"use client";

import { useActionState } from "react";

import { login } from "@/lib/auth/actions";
import { Field } from "@/components/auth/form-fields";
import { FormAlert, SubmitButton } from "@/components/forms/fields";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-3.5" noValidate={false}>
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

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        errors={state?.errors?.password}
      />

      <SubmitButton pending={pending} pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
