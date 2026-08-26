"use client";

import { useActionState, useEffect, useRef } from "react";

import { SubmitButton } from "@/components/forms/fields";
import { WatchFormMessage } from "@/components/watches/watch-form-message";
import { createWatch } from "@/lib/watches/actions";
import {
  isCompleteProposal,
  summariseProposal,
  type WatchProposal,
} from "@/lib/watches/parse";

/**
 * One-click confirmation of a parsed sentence, as a focused overlay.
 *
 * Submits the same fields as the manual form to `createWatch`. Incomplete parses cannot
 * take that shortcut — Edit details drops whatever we have into the form below.
 * Backdrop click, the X, or Escape dismisses without saving.
 */
export function ParsePreview({
  proposal,
  onEdit,
  onDismiss,
}: {
  proposal: WatchProposal;
  onEdit: () => void;
  onDismiss: () => void;
}) {
  const complete = isCompleteProposal(proposal);
  const [state, action, pending] = useActionState(createWatch, undefined);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();

    function handleKey(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onDismiss();
      }
    }

    document.addEventListener("keydown", handleKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previous;
    };
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[rgba(33,28,24,0.42)] backdrop-blur-[8px]"
        onClick={onDismiss}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="parse-preview-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-md animate-pop rounded-[18px] border
                   border-honey-border bg-card p-5 shadow-card outline-none sm:p-6"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onDismiss}
          className="absolute right-3 top-3 flex size-8 items-center justify-center
                     rounded-full text-[22px] leading-none text-muted hover:bg-honey-light
                     hover:text-espresso"
        >
          ×
        </button>

        <div className="flex flex-col gap-4 pr-6">
          <div className="space-y-1.5">
            <div
              id="parse-preview-title"
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-clay"
            >
              {complete ? "We understood" : "We understood this much"}
            </div>
            <div className="font-serif text-[clamp(22px,4vw,28px)] font-medium leading-snug
                           tracking-[-0.015em] text-espresso">
              {summariseProposal(proposal)}
            </div>
            {!complete && (
              <div className="text-[12.5px] text-muted">
                Add the missing details below before we can watch this table.
              </div>
            )}
          </div>

          {complete && (
            <form action={action} className="space-y-3">
              <input type="hidden" name="restaurantId" value={proposal.restaurantId} />
              <input type="hidden" name="targetDate" value={proposal.targetDate} />
              <input type="hidden" name="partySize" value={String(proposal.partySize)} />
              <input type="hidden" name="meal" value={proposal.meal} />

              <WatchFormMessage state={state} />

              <SubmitButton pending={pending} pendingLabel="Working out the drop time…">
                Create this watch
              </SubmitButton>
            </form>
          )}

          <button
            type="button"
            onClick={onEdit}
            className="text-left text-[13px] font-semibold text-clay-text hover:text-clay-dark"
          >
            Edit details
          </button>
        </div>
      </div>
    </div>
  );
}
