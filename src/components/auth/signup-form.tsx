"use client";

import { useActionState, useSyncExternalStore } from "react";

import { signup } from "@/lib/auth/actions";
import { AuthOrDivider, GoogleSignInButton } from "@/components/auth/google-button";
import { Field } from "@/components/auth/form-fields";
import { FormAlert, SubmitButton, TextField } from "@/components/forms/fields";
import { DEFAULT_TIMEZONE } from "@/lib/auth/schemas";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, undefined);

  /**
   * A table released at 09:00 in London is a different instant from 09:00 in New York, so
   * the user's zone is part of their profile from the start.
   *
   * It is attached here, on submit, rather than rendered into a hidden input: the server
   * cannot know the browser's zone, so putting it in the markup would mean the server and
   * client rendered different HTML. This code only ever runs in the browser, so `Intl` is
   * available and there is nothing to mismatch. The server still applies its own default
   * if the value is missing or unrecognised.
   */
  function submit(formData: FormData) {
    formData.set(
      "timezone",
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    );

    formAction(formData);
  }

  if (state?.notice) {
    return <FormAlert tone="info">{state.notice}</FormAlert>;
  }

  return (
    <div className="flex flex-col gap-3.5">
      <GoogleSignInButton />
      <AuthOrDivider />

      <form action={submit} className="flex flex-col gap-3.5">
        {state?.message && <FormAlert tone="error">{state.message}</FormAlert>}

        <div className="grid gap-3.5 sm:grid-cols-2">
          <TextField
            label="First name"
            name="firstName"
            defaultValue={state?.firstName ?? ""}
            autoComplete="given-name"
            placeholder="Amit"
            errors={state?.errors?.firstName}
            maxLength={40}
          />
          <TextField
            label="Last name"
            name="lastName"
            defaultValue={state?.lastName ?? ""}
            autoComplete="family-name"
            placeholder="Neumann"
            errors={state?.errors?.lastName}
            maxLength={40}
          />
        </div>

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
          autoComplete="new-password"
          placeholder="••••••••"
          hint="At least 8 characters."
          errors={state?.errors?.password}
        />

        <TimezoneRow />

        <SubmitButton pending={pending} pendingLabel="Creating account…">
          Create account
        </SubmitButton>
      </form>
    </div>
  );
}

/**
 * Shows the browser's IANA zone so the user can see what we will store.
 *
 * `useSyncExternalStore` is how a Client Component reads a browser-only value without a
 * `useEffect` setState (which the React Compiler forbids) and without hydrating a
 * mismatch: the server snapshot is the column default, then the client replaces it.
 */
function TimezoneRow() {
  const timezone = useSyncExternalStore(
    subscribeNever,
    readBrowserTimezone,
    () => DEFAULT_TIMEZONE,
  );

  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] bg-warm-cream px-3.5 py-[11px]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        Your timezone
      </p>
      <p className="font-serif text-[16.5px] font-medium text-espresso">{timezone}</p>
    </div>
  );
}

function subscribeNever() {
  return () => {};
}

function readBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? DEFAULT_TIMEZONE;
}
