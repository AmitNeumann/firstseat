/**
 * The credential input used by the login and signup forms.
 *
 * The label, hint, error list and aria wiring live in `@/components/forms/fields`, which
 * every feature shares; this only narrows the input to the two types auth needs.
 */

import { FieldShell } from "@/components/forms/fields";

type FieldProps = {
  label: string;
  name: string;
  type: "email" | "password";
  autoComplete: string;
  defaultValue?: string;
  hint?: string;
  errors?: string[];
};

export function Field({
  label,
  name,
  type,
  autoComplete,
  defaultValue,
  hint,
  errors,
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
          // The browser check is a convenience. Both forms are re-validated on the
          // server, which is the only check that counts.
          required
        />
      )}
    </FieldShell>
  );
}
