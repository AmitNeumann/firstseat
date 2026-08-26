"use client";

import { useCallback, useState } from "react";

import { DescribeIt, fillFromProposal, type WatchFormFill } from "@/components/watches/describe-it";
import { CreateWatchForm } from "@/components/watches/create-watch-form";
import { ParsePreview } from "@/components/watches/parse-preview";
import type { RestaurantOption } from "@/lib/watches/options";
import type { WatchProposal } from "@/lib/watches/parse";

/**
 * Create-watch page body: Describe it, an optional confirmation card, then the manual form.
 *
 * A successful parse shows a one-click confirmation overlay. Edit details remounts the
 * form with those values. The form still submits to `createWatch` on its own.
 */
export function CreateWatchComposer({
  restaurants,
  earliestDate,
  latestDate,
  timezone,
  initialRestaurantId,
}: {
  restaurants: RestaurantOption[];
  earliestDate: string;
  latestDate: string;
  timezone: string;
  initialRestaurantId?: string;
}) {
  const [proposal, setProposal] = useState<WatchProposal | null>(null);
  const [fill, setFill] = useState<WatchFormFill | null>(null);

  const handleDismiss = useCallback(() => {
    setProposal(null);
  }, []);

  function handleEdit(): void {
    if (!proposal) {
      return;
    }

    setFill(fillFromProposal(proposal));
    setProposal(null);
  }

  return (
    <>
      <div className="mt-8 flex flex-col gap-5">
        <DescribeIt
          onStart={() => setProposal(null)}
          onProposal={(next) => {
            setProposal(next);
            setFill(null);
          }}
        />
        {proposal && (
          <ParsePreview
            proposal={proposal}
            onEdit={handleEdit}
            onDismiss={handleDismiss}
          />
        )}
        <div className="flex items-center gap-3.5">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-tan">
            or enter it yourself
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>

      <section className="mt-3 rounded-2xl border border-border bg-card p-6">
        <CreateWatchForm
          key={fill ? `fill-${fill.stamp}` : "manual"}
          restaurants={restaurants}
          earliestDate={earliestDate}
          latestDate={latestDate}
          timezone={timezone}
          initialRestaurantId={fill?.restaurantId ?? initialRestaurantId}
          initialTargetDate={fill?.targetDate}
          initialPartySize={fill?.partySize}
          initialMeal={fill?.meal}
        />
      </section>
    </>
  );
}
