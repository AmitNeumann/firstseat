/**
 * Presentational pieces shared by the login and signup forms.
 *
 * No hooks, so these stay usable from either a Server or a Client Component.
 */

const inputClasses =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none " +
  "transition-colors placeholder:text-muted focus:border-accent " +
  "focus:ring-2 focus:ring-accent/25 aria-invalid:border-danger";

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
  const hasErrors = Boolean(errors?.length);
  const describedBy = hasErrors ? `${name}-error` : hint ? `${name}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required
        // The browser check is a convenience. Both forms are re-validated on the server,
        // which is the only check that counts.
        aria-invalid={hasErrors || undefined}
        aria-describedby={describedBy}
        className={inputClasses}
      />

      {hint && !hasErrors && (
        <p id={`${name}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}

      {hasErrors && (
        <ul id={`${name}-error`} className="space-y-0.5 text-xs text-danger">
          {errors!.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FormAlert({
  tone,
  children,
}: {
  tone: "error" | "info";
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === "error"
      ? "border-danger/30 bg-danger/10 text-danger"
      : "border-border bg-background text-foreground";

  return (
    <p
      // Announced by screen readers when the action comes back, rather than silently
      // appearing above the form.
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2 text-sm ${toneClasses}`}
    >
      {children}
    </p>
  );
}

export function SubmitButton({
  pending,
  children,
  pendingLabel,
}: {
  pending: boolean;
  children: React.ReactNode;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground
                 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
