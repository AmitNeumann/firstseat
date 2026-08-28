"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormAlert } from "@/components/forms/fields";
import { deleteAccount } from "@/lib/auth/actions";

/**
 * Understated delete control at the bottom of the Settings card.
 *
 * Confirm lives in a dialog, same pattern as deleting a watch. The Server Action ignores
 * the request unless the hidden `confirm` field is set, and it never takes a user id
 * from the client.
 */
export function DeleteAccount() {
  const [state, action] = useActionState(deleteAccount, undefined);
  const [confirming, setConfirming] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!confirming) {
      return;
    }

    panelRef.current?.focus();

    function handleKey(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setConfirming(false);
      }
    }

    document.addEventListener("keydown", handleKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previous;
    };
  }, [confirming]);

  return (
    <div className="mt-6">
      {state?.message && (
        <div className="mb-3">
          <FormAlert tone="error">{state.message}</FormAlert>
        </div>
      )}

      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-[13px] font-medium text-clay hover:text-clay-dark hover:underline
                   underline-offset-2"
      >
        Delete your account
      </button>

      {confirming ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[rgba(33,28,24,0.42)] backdrop-blur-[8px]"
            onClick={() => setConfirming(false)}
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            aria-describedby="delete-account-copy"
            tabIndex={-1}
            className="relative z-10 w-full max-w-sm animate-pop rounded-[18px] border
                       border-honey-border bg-card p-5 shadow-card outline-none sm:p-6"
          >
            <h2
              id="delete-account-title"
              className="font-serif text-[clamp(20px,3.6vw,24px)] font-medium leading-snug
                         tracking-[-0.015em] text-espresso"
            >
              Are you sure?
            </h2>
            <p id="delete-account-copy" className="mt-2 text-sm leading-normal text-soft">
              This permanently deletes your account and all your watches. This cannot be
              undone.
            </p>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-[10px] border border-honey-border bg-cream px-[18px]
                           py-2.5 text-[13px] font-semibold text-muted hover:bg-warm-cream
                           hover:text-soft"
              >
                Cancel
              </button>

              <form action={action}>
                <input type="hidden" name="confirm" value="delete-account" />
                <ConfirmDeleteAccountButton />
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ConfirmDeleteAccountButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-[10px] bg-clay px-[18px] py-2.5 text-[13px] font-semibold
                 text-cream-on-clay hover:bg-clay-dark disabled:opacity-70"
    >
      {pending ? "Deleting…" : "Confirm"}
    </button>
  );
}
