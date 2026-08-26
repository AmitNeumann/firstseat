import { NextResponse } from "next/server";
import * as z from "zod";

import { getAppUser } from "@/lib/auth/dal";
import { addDays, civilDateInZone, formatCivilDate } from "@/lib/time";
import { PARSE_MAX_CHARS } from "@/lib/watches/parse-limits";
import { proposeWatchFields } from "@/lib/watches/parse";
import {
  PARSE_MODEL,
  extractWatchJson,
  ParseConfigError,
  ParseModelError,
} from "@/lib/watches/parse-gemini";
import {
  PARSE_MAX_CALLS_PER_DAY,
  consumeParseAllowance,
} from "@/lib/watches/parse-rate-limit";
import { listRestaurantOptions } from "@/lib/watches/queries";
import { MAX_DAYS_AHEAD } from "@/lib/watches/schemas";

export const runtime = "nodejs";

const BodySchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, { error: "Type a sentence first." })
    .max(PARSE_MAX_CHARS, { error: "That's too long — try a shorter sentence." }),
});

/**
 * Parse a free-text sentence into a watch proposal.
 *
 * Signed-in only: every call spends Gemini quota. The response is a suggestion for the
 * create form, never a new `watches` row.
 */
export async function POST(request: Request) {
  const user = await getAppUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Sign in to use this." },
      { status: 401 },
    );
  }

  if (!consumeParseAllowance(user.id)) {
    return NextResponse.json(
      {
        ok: false,
        error: `That's a lot of tries for one day (max ${PARSE_MAX_CALLS_PER_DAY}). Fill the form below instead.`,
      },
      { status: 429 },
    );
  }

  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Couldn't read that just now. Fill the form below instead." },
      { status: 200 },
    );
  }

  const body = BodySchema.safeParse(json);

  if (!body.success) {
    const message = body.error.issues[0]?.message ?? "Type a sentence first.";
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }

  const today = civilDateInZone(new Date(), user.timezone);
  const earliestDate = formatCivilDate(today);
  const latestDate = formatCivilDate(addDays(today, MAX_DAYS_AHEAD));
  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: user.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const started = performance.now();
  const dbStarted = performance.now();
  const restaurantsPromise = listRestaurantOptions().then((restaurants) => ({
    restaurants,
    dbMs: Math.round(performance.now() - dbStarted),
  }));

  let geminiMs = 0;

  try {
    const geminiStarted = performance.now();
    const [loaded, extracted] = await Promise.all([
      restaurantsPromise,
      extractWatchJson({
        text: body.data.text,
        timezone: user.timezone,
        todayLabel,
        todayIso: earliestDate,
      }).finally(() => {
        geminiMs = Math.round(performance.now() - geminiStarted);
      }),
    ]);

    const proposeStarted = performance.now();
    const outcome = proposeWatchFields({
      model: extracted,
      restaurants: loaded.restaurants,
      earliestDate,
      latestDate,
    });
    const proposeMs = Math.round(performance.now() - proposeStarted);

    console.info("[watches/parse] timing", {
      model: PARSE_MODEL,
      dbMs: loaded.dbMs,
      geminiMs,
      proposeMs,
      totalMs: Math.round(performance.now() - started),
      ok: outcome.ok,
    });

    return NextResponse.json(outcome);
  } catch (error) {
    if (error instanceof ParseConfigError) {
      console.error("[watches/parse] GEMINI_API_KEY is missing");
    } else if (error instanceof ParseModelError) {
      console.error("[watches/parse] model error:", error.message, {
        model: PARSE_MODEL,
        geminiMs,
        totalMs: Math.round(performance.now() - started),
      });
    } else {
      console.error("[watches/parse] unexpected error:", error);
    }

    return NextResponse.json(
      { ok: false, error: "Couldn't read that just now. Fill the form below instead." },
      { status: 200 },
    );
  }
}
