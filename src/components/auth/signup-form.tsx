"use client";

import { useActionState } from "react";

import { signup } from "@/lib/auth/actions";
import { Field, FormAlert, SubmitButton } from "@/components/auth/form-fields";

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
    <form action={submit} className="space-y-4">
      {state?.message && <FormAlert tone="error">{state.message}</FormAlert>}

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
        autoComplete="new-password"
        hint="At least 8 characters."
        errors={state?.errors?.password}
      />

      <SubmitButton pending={pending} pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
