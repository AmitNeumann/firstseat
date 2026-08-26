/**
 * The drop-alert email, as subject / text / HTML.
 *
 * Pure on purpose: the wording is what we can unit-test without Resend, and the send
 * path only interpolates. Drop times are not computed here — the caller already has
 * `alertAt` / `dropDatetime` from `computeDropMoment`.
 */

import { Meal } from "@/generated/prisma/enums";
import { greetingFirstName } from "@/lib/auth/display";
import { DEFAULT_ALERT_LEAD_MINUTES } from "@/lib/watches/drop-time";
import { MEAL_LABELS, formatDate, formatInstant, platformLabel } from "@/lib/watches/format";

export const ALERT_FROM = "FirstSeat <onboarding@resend.dev>";

export type AlertEmailInput = {
  firstName: string | null;
  restaurantName: string;
  targetDate: string;
  meal: Meal;
  partySize: number;
  platform: string;
  bookingUrl: string;
  dropDatetime: Date;
  userTimezone: string;
};

export type AlertEmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function renderAlertEmail(input: AlertEmailInput): AlertEmailContent {
  const platform = platformLabel(input.platform);
  const meal = MEAL_LABELS[input.meal];
  const party =
    input.partySize === 1 ? "Party of 1" : `Party of ${input.partySize}`;
  const diningDate = formatDate(input.targetDate);
  const dropWhen = formatInstant(input.dropDatetime, input.userTimezone);
  const greeting = greetingFirstName(input.firstName);
  const hello = greeting ? `Hi ${greeting},` : "Hi,";
  const lead = DEFAULT_ALERT_LEAD_MINUTES;

  const subject = `${input.restaurantName} opens on ${platform} in ${lead} minutes`;

  const text = [
    hello,
    "",
    `Your table at ${input.restaurantName} is about to open.`,
    "",
    `${diningDate} · ${meal} · ${party}`,
    `Opens on ${platform} at ${dropWhen} your time.`,
    "",
    `Book now (${lead} minutes):`,
    input.bookingUrl,
    "",
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
                <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;font-weight:500;">${escapeHtml(input.restaurantName)} opens in ${lead} minutes</h1>
                <p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#5C4033;">
                  ${escapeHtml(diningDate)} · ${escapeHtml(meal)} · ${escapeHtml(party)}
                </p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#5C4033;">
                  Bookings open on ${escapeHtml(platform)} at ${escapeHtml(dropWhen)} your time.
                </p>
                <p style="margin:0 0 28px;">
                  <a href="${escapeHtml(input.bookingUrl)}" style="display:inline-block;background:#C75C40;color:#FFFaf3;text-decoration:none;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;padding:14px 20px;border-radius:10px;">
                    Book on ${escapeHtml(platform)}
                  </a>
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#8A7060;font-family:system-ui,sans-serif;">
                  You asked FirstSeat to watch this table. The link goes straight to ${escapeHtml(platform)}.
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
