/**
 * The one-off welcome email sent when a `users` row is first created.
 *
 * Pure, like `renderAlertEmail`: unit-tested without Resend. This is not a drop alert
 * and is never queued through `dispatchDueAlerts`.
 */

import { greetingFirstName } from "@/lib/auth/display";

export type WelcomeEmailInput = {
  firstName: string | null;
  origin: string;
};

export type WelcomeEmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function renderWelcomeEmail(input: WelcomeEmailInput): WelcomeEmailContent {
  const greeting = greetingFirstName(input.firstName);
  const hello = greeting ? `Hi ${greeting},` : "Hi,";
  const newWatchUrl = `${input.origin}/watches/new`;
  const subject = "Welcome to FirstSeat";

  const text = [
    hello,
    "",
    "FirstSeat watches New York's hardest restaurant tables for you.",
    "Tell us the restaurant, date, meal and party — we know when bookings open, and we email you a few minutes before, with the link ready.",
    "",
    "Create your first watch:",
    newWatchUrl,
    "",
    "See you at the drop,",
    "FirstSeat",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#F6F0E6;color:#2C1810;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F0E6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFaf3;border:1px solid #E8D9C4;border-radius:16px;padding:28px 24px;">
            <tr>
              <td>
                <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#C75C40;font-family:system-ui,sans-serif;font-weight:600;">FirstSeat</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.4;">${escapeHtml(hello)}</p>
                <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;font-weight:500;">Welcome to FirstSeat</h1>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#5C4033;">
                  We watch New York&apos;s hardest restaurant tables for you. Tell us the
                  restaurant, date, meal and party — we know when bookings open, and we
                  email you a few minutes before, with the link ready.
                </p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#5C4033;">
                  Create your first watch to get started.
                </p>
                <p style="margin:0 0 28px;">
                  <a href="${escapeHtml(newWatchUrl)}" style="display:inline-block;background:#C75C40;color:#FFFaf3;text-decoration:none;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;padding:14px 20px;border-radius:10px;">
                    Create a watch
                  </a>
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#8A7060;font-family:system-ui,sans-serif;">
                  This is a one-time hello. Drop alerts are a separate email, sent only for tables you watch.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
