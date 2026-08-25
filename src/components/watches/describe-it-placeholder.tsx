/**
 * The natural-language field from the design.
 *
 * Sits on the same cream page as the manual fields — not in its own dark or boxed
 * panel. The parse endpoint is not built yet, so this does not submit and does not
 * fill anything in. Wire it up later; until then it is a styled placeholder.
 */
export function DescribeItPlaceholder() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <label
          htmlFor="describe-it"
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-clay"
        >
          Describe it
        </label>
        <input
          id="describe-it"
          type="text"
          placeholder="Minetta, Sept 24, dinner for 2"
          autoComplete="off"
          aria-describedby="describe-it-note"
          className="w-full rounded-xl border border-border-warm bg-card px-4 py-3.5
                     font-serif text-[20px] font-normal text-foreground outline-none
                     placeholder:text-placeholder"
        />
        <p id="describe-it-note" className="sr-only">
          Natural-language parsing is not available yet. Use the fields below.
        </p>
      </div>

      <div className="flex items-center gap-3.5">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-tan">
          or enter it yourself
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
