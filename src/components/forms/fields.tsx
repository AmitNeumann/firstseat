/**
 * Presentational form pieces shared across features.
 *
 * No hooks, so these stay usable from either a Server or a Client Component. Every input
 * takes its errors as a prop rather than validating anything itself — validation happens
 * on the server, and these only display the result.
 *
 * Visual language: uppercase micro-labels, cream fields on a white card, clay for the
 * primary action and for anything that went wrong. Callers can pass `controlClassName`
 * when a field sits on cream instead of white (the watch sheet uses a white fill).
 */

const controlClasses =
  "w-full rounded-control border border-border bg-background px-3.5 py-3 text-[15px] " +
  "text-foreground outline-none transition-[background-color,border-color,color] duration-150 " +
  "placeholder:text-placeholder aria-invalid:border-clay";

type ShellProps = {
  label: string;
  name: string;
  hint?: string;
  errors?: string[];
  /** Extra classes for the control, e.g. `bg-card` on a cream surface. */
  controlClassName?: string;
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
export function FieldShell({
  label,
  name,
  hint,
  errors,
  controlClassName,
  children,
}: ShellProps) {
  const hasErrors = Boolean(errors?.length);
  const describedBy = hasErrors ? `${name}-error` : hint ? `${name}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted"
      >
        {label}
      </label>

      {children({
        id: name,
        "aria-invalid": hasErrors || undefined,
        "aria-describedby": describedBy,
        className: controlClassName
          ? `${controlClasses} ${controlClassName}`
          : controlClasses,
      })}

      {hint && !hasErrors && (
        <p id={`${name}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}

      {hasErrors && (
        <ul id={`${name}-error`} className="space-y-0.5 text-xs text-clay-dark">
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
  controlClassName,
}: {
  label: string;
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  /** Shown as a disabled first option, so the form cannot be submitted unanswered. */
  placeholder?: string;
  hint?: string;
  errors?: string[];
  controlClassName?: string;
}) {
  return (
    <FieldShell
      label={label}
      name={name}
      hint={hint}
      errors={errors}
      controlClassName={controlClassName}
    >
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

export function TextField({
  label,
  name,
  defaultValue,
  autoComplete,
  placeholder,
  hint,
  errors,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
  errors?: string[];
  maxLength?: number;
}) {
  return (
    <FieldShell label={label} name={name} hint={hint} errors={errors}>
      {(props) => (
        <input
          {...props}
          type="text"
          name={name}
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          placeholder={placeholder}
          maxLength={maxLength}
        />
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
  controlClassName,
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
  controlClassName?: string;
}) {
  return (
    <FieldShell
      label={label}
      name={name}
      hint={hint}
      errors={errors}
      controlClassName={controlClassName}
    >
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
      ? "border-apricot/50 bg-honey-light text-clay-dark"
      : "border-honey-border bg-honey text-clay-text";

  return (
    <div
      // Announced by screen readers when the action comes back, rather than silently
      // appearing above the form.
      role={tone === "error" ? "alert" : "status"}
      className={`space-y-2 rounded-xl border px-3.5 py-3 text-[13px] font-semibold ${toneClasses}`}
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
      className="w-full rounded-button bg-clay px-3.5 py-3.5 text-[15px] font-semibold
                 text-cream-on-clay hover:bg-clay-dark disabled:pointer-events-none
                 disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
