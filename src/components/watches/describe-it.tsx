"use client";

import { useState } from "react";

import { FormAlert } from "@/components/forms/fields";
import { PARSE_MAX_CHARS } from "@/lib/watches/parse-limits";
import type { WatchProposal } from "@/lib/watches/parse";

export type WatchFormFill = {
  restaurantId: string;
  targetDate?: string;
  partySize?: string;
  meal?: string;
  stamp: number;
};

/**
 * The natural-language shortcut above the create-watch form.
 *
 * Submitting here never creates a watch. It asks the server to parse the sentence; the
 * parent shows a confirmation card. The diner still has to confirm.
 */
export function DescribeIt({
  onStart,
  onProposal,
}: {
  onStart: () => void;
  onProposal: (proposal: WatchProposal) => void;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const sentence = text.trim();

    if (!sentence || pending) {
      return;
    }

    setPending(true);
    setError(null);
    onStart();

    try {
      const response = await fetch("/api/watches/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sentence }),
      });

      const payload = (await response.json()) as
        | { ok: true; proposal: WatchProposal }
        | { ok: false; error: string };

      if (!payload.ok) {
        setError(payload.error);
        return;
      }

      onProposal(payload.proposal);
    } catch {
      setError("Couldn't read that just now. Fill the form below instead.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3"
        aria-busy={pending}
      >
        <label
          htmlFor="describe-it"
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-clay"
        >
          Describe your reservation
        </label>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
          <input
            id="describe-it"
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Minetta, Sept 24, dinner for 2"
            autoComplete="off"
            maxLength={PARSE_MAX_CHARS}
            aria-describedby="describe-it-note"
            disabled={pending}
            className="w-full rounded-xl border border-border-warm bg-card px-4 py-3.5
                       font-serif text-[20px] font-normal text-foreground outline-none
                       placeholder:text-placeholder disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={pending || text.trim().length === 0}
            className="shrink-0 rounded-[11px] bg-clay px-[18px] py-3.5 text-[13.5px]
                       font-semibold text-cream-on-clay hover:bg-clay-dark
                       disabled:pointer-events-none disabled:opacity-60 sm:min-w-[9.5rem]"
          >
            {pending ? "Reading…" : "Read it"}
          </button>
        </div>
      </form>

      {pending ? (
        <div
          id="describe-it-note"
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-xl border border-honey-border
                     bg-honey-light px-4 py-3"
        >
          <span
            aria-hidden="true"
            className="size-5 shrink-0 animate-spin rounded-full border-2 border-honey
                       border-t-clay"
          />
          <span className="text-[13.5px] font-semibold text-clay-text">
            Reading your request…
          </span>
        </div>
      ) : (
        <div id="describe-it-note" className="text-[12.5px] text-muted">
          We show you a summary to confirm. Nothing is saved until you say so. The form
          below still works on its own.
        </div>
      )}

      {error && <FormAlert tone="error">{error}</FormAlert>}
    </>
  );
}

export function fillFromProposal(proposal: WatchProposal): WatchFormFill {
  return {
    restaurantId: proposal.restaurantId,
    targetDate: proposal.targetDate,
    partySize: proposal.partySize !== undefined ? String(proposal.partySize) : undefined,
    meal: proposal.meal,
    stamp: Date.now(),
  };
}
