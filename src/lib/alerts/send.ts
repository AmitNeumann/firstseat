import "server-only";

import { Resend } from "resend";

import {
  ALERT_FROM,
  renderAlertEmail,
  type AlertEmailInput,
} from "@/lib/alerts/email";
import { renderWelcomeEmail } from "@/lib/alerts/welcome";

export class AlertConfigError extends Error {
  constructor() {
    super("RESEND_API_KEY is not set");
    this.name = "AlertConfigError";
  }
}

let cached: { key: string; client: Resend } | undefined;

function getResend(apiKey: string): Resend {
  if (!cached || cached.key !== apiKey) {
    cached = { key: apiKey, client: new Resend(apiKey) };
  }

  return cached.client;
}

/**
 * Hand the composed alert to Resend. The key is read here from `RESEND_API_KEY` —
 * never a `NEXT_PUBLIC_` variable.
 */
export async function sendAlertEmail(input: AlertEmailInput & { to: string }): Promise<void> {
  const content = renderAlertEmail(input);
  await sendFromAlerts({
    to: input.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}

/**
 * One-time hello after the `users` row is created. Failures must not block sign-up.
 *
 * Separate from `sendAlertEmail` and from `dispatchDueAlerts` — cron never sends this.
 */
export async function sendWelcomeEmail(input: {
  to: string;
  firstName: string | null;
  origin: string;
}): Promise<void> {
  const content = renderWelcomeEmail({
    firstName: input.firstName,
    origin: input.origin,
  });
  await sendFromAlerts({
    to: input.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}

async function sendFromAlerts(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new AlertConfigError();
  }

  const result = await getResend(apiKey).emails.send({
    from: ALERT_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}
