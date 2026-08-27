"use client";

import { useActionState } from "react";
import Link from "next/link";

import { login } from "@/lib/auth/actions";
import { AuthOrDivider, GoogleSignInButton } from "@/components/auth/google-button";
import { Field } from "@/components/auth/form-fields";
import { FormAlert, SubmitButton } from "@/components/forms/fields";

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className="flex flex-col gap-3.5">
      {state?.message && <FormAlert tone="error">{state.message}</FormAlert>}
      {!state && notice && <FormAlert tone="error">{notice}</FormAlert>}

      <form action={action} className="flex flex-col gap-3.5" noValidate={false}>
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

        <div className="-mt-1 flex justify-end">
          <Link
            href="/forgot-password"
            className="rounded-lg px-1 py-1 text-[13px] font-semibold text-clay-text
                       hover:bg-honey-light hover:text-clay-dark"
          >
            Forgot password?
          </Link>
        </div>

        <SubmitButton pending={pending} pendingLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>

      <AuthOrDivider />
      <GoogleSignInButton />
    </div>
  );
}
