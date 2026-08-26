import { NextResponse } from "next/server";

import { cronAuthorized } from "@/lib/alerts/cron-auth";
import { dispatchDueAlerts } from "@/lib/alerts/dispatch";
import { AlertConfigError } from "@/lib/alerts/send";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Vercel Cron hits this on a schedule. Locally: 
 * `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/alerts`
 *
 * Timing is not recalculated here. We only deliver rows whose `alertAt` has already
 * passed and that are still SCHEDULED.
 */
async function handle(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await dispatchDueAlerts();
    console.info("[alerts] dispatch", summary);
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    if (error instanceof AlertConfigError) {
      console.error("[alerts] RESEND_API_KEY is missing");
      return NextResponse.json({ ok: false, error: "Mailer is not configured." }, { status: 503 });
    }

    console.error("[alerts] dispatch failed:", error);
    return NextResponse.json({ ok: false, error: "Dispatch failed." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
