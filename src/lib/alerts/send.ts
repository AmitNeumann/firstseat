import "server-only";

import { Resend } from "resend";

import {
  ALERT_FROM,
  renderAlertEmail,
  type AlertEmailInput,
} from "@/lib/alerts/email";

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
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new AlertConfigError();
  }

  const content = renderAlertEmail(input);
  const result = await getResend(apiKey).emails.send({
    from: ALERT_FROM,
    to: input.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}
