/**
 * Presentational form pieces shared across features.
 *
 * No hooks, so these stay usable from either a Server or a Client Component. Every input
 * takes its errors as a prop rather than validating anything itself — validation happens
 * on the server, and these only display the result.
 */

const controlClasses =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none " +
  "transition-colors placeholder:text-muted focus:border-accent " +
  "focus:ring-2 focus:ring-accent/25 aria-invalid:border-danger";

type ShellProps = {
  label: string;
  name: string;
  hint?: string;
  errors?: string[];
  children: (props: {
    id: string;
    "aria-invalid": true | undefined;
    "aria-describedby": string | undefined;
    className: string;
  }) => React.ReactNode;
};

/**
 * The label / hint / error wrapper every field shares, including the aria wiring that
 * connects a message to the input a screen reader is sitting on.
 */
export function FieldShell({ label, name, hint, errors, children }: ShellProps) {
  const hasErrors = Boolean(errors?.length);
  const describedBy = hasErrors ? `${name}-error` : hint ? `${name}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>

      {children({
        id: name,
        "aria-invalid": hasErrors || undefined,
        "aria-describedby": describedBy,
        className: controlClasses,
      })}

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

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function SelectField({
  label,
  name,
  options,
  defaultValue,
  placeholder,
  hint,
  errors,
}: {
  label: string;
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  /** Shown as a disabled first option, so the form cannot be submitted unanswered. */
  placeholder?: string;
  hint?: string;
  errors?: string[];
}) {
  return (
    <FieldShell label={label} name={name} hint={hint} errors={errors}>
      {(props) => (
        <select {...props} name={name} defaultValue={defaultValue ?? ""} required>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

export function DateField({
  label,
  name,
  min,
  max,
  defaultValue,
  hint,
  errors,
  onChange,
}: {
  label: string;
  name: string;
  /** "YYYY-MM-DD". A browser hint only — the server re-checks the range. */
  min?: string;
  max?: string;
  defaultValue?: string;
  hint?: string;
  errors?: string[];
  /** Notified as the date changes, so a caller can preview something from it. */
  onChange?: (value: string) => void;
}) {
  return (
    <FieldShell label={label} name={name} hint={hint} errors={errors}>
      {(props) => (
        <input
          {...props}
          name={name}
          type="date"
          min={min}
          max={max}
          defaultValue={defaultValue}
          onChange={onChange && ((event) => onChange(event.target.value))}
          required
        />
      )}
    </FieldShell>
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
    <div
      // Announced by screen readers when the action comes back, rather than silently
      // appearing above the form.
      role={tone === "error" ? "alert" : "status"}
      className={`space-y-2 rounded-lg border px-3 py-2 text-sm ${toneClasses}`}
    >
      {children}
    </div>
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
