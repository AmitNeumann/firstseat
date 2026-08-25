"use client";

import { FormAlert } from "@/components/forms/fields";
import type { WatchFormState } from "@/lib/watches/schemas";

/**
 * Whole-form refusal shown next to the submit button.
 *
 * `createWatch` can refuse a date whose window already opened — that is the intended
 * rule, not a bug. The message used to sit at the top of a long form, so clicking
 * Create watch looked like nothing happened. Scrolling this into view is the other
 * half of making the refusal unmissable.
 */
export function WatchFormMessage({ state }: { state: WatchFormState }) {
  if (!state?.message) {
    return null;
  }

  return (
    <div
      ref={(node) => {
        node?.scrollIntoView({ block: "center", behavior: "smooth" });
      }}
    >
      <FormAlert tone="error">
        <p>{state.message}</p>
        {state.bookingUrl && (
          <a
            href={state.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-medium underline underline-offset-2"
          >
            Book it directly
          </a>
        )}
      </FormAlert>
    </div>
  );
}
