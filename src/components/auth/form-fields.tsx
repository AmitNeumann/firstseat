"use client";

/**
 * The credential inputs used by the login and signup forms.
 *
 * The label, hint, error list and aria wiring live in `@/components/forms/fields`, which
 * every feature shares; this only narrows the input to the types auth needs. Password
 * visibility is a client toggle so the value never has to round-trip through a Server
 * Action just to be shown.
 */

import { useState } from "react";

import { FieldShell } from "@/components/forms/fields";

type FieldProps = {
  label: string;
  name: string;
  type: "email" | "password";
  autoComplete: string;
  defaultValue?: string;
  hint?: string;
  errors?: string[];
  placeholder?: string;
};

export function Field({
  label,
  name,
  type,
  autoComplete,
  defaultValue,
  hint,
  errors,
  placeholder,
}: FieldProps) {
  return (
    <FieldShell label={label} name={name} hint={hint} errors={errors}>
      {(props) => (
        <input
          {...props}
          name={name}
          type={type}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          placeholder={placeholder}
          // The browser check is a convenience. Both forms are re-validated on the
          // server, which is the only check that counts.
          required
        />
      )}
    </FieldShell>
  );
}

export function PasswordField({
  label,
  name,
  autoComplete,
  hint,
  errors,
  placeholder,
}: Omit<FieldProps, "type" | "defaultValue">) {
  const [visible, setVisible] = useState(false);

  return (
    <FieldShell label={label} name={name} hint={hint} errors={errors}>
      {(props) => (
        <div className="relative">
          <input
            {...props}
            className={`${props.className} pr-11`}
            name={name}
            type={visible ? "text" : "password"}
            autoComplete={autoComplete}
            placeholder={placeholder}
            required
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5
                       text-muted hover:bg-warm-cream hover:text-soft"
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      )}
    </FieldShell>
  );
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.2 12S5.6 5.8 12 5.8 21.8 12 21.8 12 18.4 18.2 12 18.2 2.2 12 2.2 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7a2.6 2.6 0 0 0 3.7 3.6" />
      <path d="M7 7.4C4.6 8.9 2.8 11.1 2.2 12c0 0 3.4 6.2 9.8 6.2 1.6 0 3-.3 4.3-.8" />
      <path d="M14.1 6.1A10 10 0 0 1 12 5.8C5.6 5.8 2.2 12 2.2 12" />
      <path d="M17.3 9.2c1.5 1.1 2.7 2.5 3.5 3.6 0 0-1.2 2.2-3.4 4" />
    </svg>
  );
}
