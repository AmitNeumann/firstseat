"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useSyncExternalStore } from "react";

import { LandingPreviewCard } from "@/components/landing/preview-card";
import { Meal } from "@/generated/prisma/enums";
import { addDays, civilDateInZone, formatCivilDate } from "@/lib/time";
import { computeDropMoment } from "@/lib/watches/drop-time";
import {
  LANDING_DEMO_PLACEHOLDER,
  parseLandingDemo,
} from "@/lib/watches/landing-demo";
import type { RestaurantOption } from "@/lib/watches/options";

/**
 * Signed-out "Try it" card.
 *
 * First press reveals a drop preview for Minetta Tavern, computed with the same
 * `computeDropMoment` the server uses to schedule real alerts. Second press goes to
 * sign-up — we do not create a watch yet, and we never send the rest of the catalog.
 */
export function LandingTryIt({ restaurant }: { restaurant: RestaurantOption | null }) {
  const router = useRouter();
  const [sentence, setSentence] = useState("");
  const [shown, setShown] = useState(false);
  const [miss, setMiss] = useState(false);
  const [userZone, setUserZone] = useState("Europe/London");
  const now = useTickingNow(shown);

  const preview =
    restaurant && shown
      ? buildPreview(restaurant, sentence, userZone, now)
      : null;

  function handleSentenceChange(value: string) {
    setSentence(value);
    setShown(false);
    setMiss(false);
  }

  function handleSubmit() {
    if (!restaurant) {
      return;
    }

    if (shown && preview) {
      router.push("/signup");
      return;
    }

    const zone =
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? "Europe/London";
    setUserZone(zone);

    const parsed = parseLandingDemo(sentence, restaurant);

    if (!parsed.matched) {
      setMiss(true);
      setShown(false);
      return;
    }

    setMiss(false);
    setShown(true);
  }

  return (
    <div
      className="flex w-full max-w-[540px] flex-col gap-3 rounded-[18px] border border-border
                 bg-card p-[clamp(16px,3vw,22px)] text-left shadow-card"
    >
      <label
        htmlFor="landing-demo"
        className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
      >
        Try it — what are you after?
      </label>

      <input
        id="landing-demo"
        value={sentence}
        onChange={(event) => handleSentenceChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            handleSubmit();
          }
        }}
        placeholder={LANDING_DEMO_PLACEHOLDER}
        className="w-full rounded-[11px] border border-border bg-background px-[15px] py-[13px]
                   text-base text-espresso outline-none"
      />

      <p className="text-xs text-muted">
        Try it with{" "}
        <span className="font-semibold text-clay-text">Minetta Tavern</span>
        {" — "}
        the full list of restaurants we watch is for subscribers.
      </p>

      {miss && (
        <p role="status" className="text-xs font-medium text-clay-text">
          This preview is Minetta Tavern only. Sign up to watch any restaurant we track.
        </p>
      )}

      {preview && <LandingPreviewCard {...preview} now={now} />}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!restaurant}
        className="rounded-button bg-clay px-3.5 py-3.5 text-[14.5px] font-semibold
                   text-cream-on-clay hover:bg-clay-dark disabled:pointer-events-none
                   disabled:opacity-60"
      >
        {shown ? "Alert me before this drops" : "Show me the drop time"}
      </button>
    </div>
  );
}

/**
 * A one-second clock that only ticks while the preview is on screen.
 *
 * Snapshot is the current second (not `Date.now()` itself) so React can tell that
 * nothing changed between renders inside the same second.
 */
function useTickingNow(enabled: boolean): number {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!enabled) {
        return () => {};
      }

      const id = window.setInterval(onChange, 1000);
      return () => window.clearInterval(id);
    },
    [enabled],
  );

  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 1000) * 1000,
    () => 0,
  );
}

function buildPreview(
  restaurant: RestaurantOption,
  sentence: string,
  userZone: string,
  now: number,
) {
  const parsed = parseLandingDemo(sentence, restaurant, new Date(now || Date.now()));

  if (!parsed.matched) {
    return null;
  }

  const rule = restaurant.rules[0];

  if (!rule) {
    return null;
  }

  const clock = now || Date.now();
  const today = civilDateInZone(new Date(clock), userZone);
  const targetDate =
    parsed.date ?? formatCivilDate(addDays(today, rule.daysInAdvance + 1));
  const meal = parsed.meal ?? Meal.DINNER;
  const partySize = parsed.partySize ?? 2;

  try {
    const moment = computeDropMoment({ targetDate, rule });

    return {
      name: restaurant.name,
      targetDate,
      meal,
      partySize,
      dropDatetime: moment.dropDatetime,
      alertAt: moment.alertAt,
      platform: rule.platform,
      restaurantZone: rule.timezone,
      userZone,
    };
  } catch {
    return null;
  }
}
