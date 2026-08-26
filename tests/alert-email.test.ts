/**
 * Drop-alert email copy, without calling Resend.
 */

import { describe, expect, it } from "vitest";

import { Meal } from "@/generated/prisma/enums";
import { cronAuthorized } from "@/lib/alerts/cron-auth";
import { renderAlertEmail } from "@/lib/alerts/email";

const sample = {
  firstName: "Amit",
  restaurantName: "Minetta Tavern",
  targetDate: "2026-09-24",
  meal: Meal.DINNER,
  partySize: 2,
  platform: "resy",
  bookingUrl: "https://resy.com/cities/ny/minetta-tavern",
  dropDatetime: new Date("2026-08-25T04:00:00.000Z"),
  userTimezone: "Asia/Jerusalem",
};

describe("renderAlertEmail", () => {
  it("names the restaurant, the meal, and the booking link", () => {
    const email = renderAlertEmail(sample);

    expect(email.subject).toContain("Minetta Tavern");
    expect(email.subject).toContain("Resy");
    expect(email.subject).toContain("5 minutes");
    expect(email.text).toContain("Hi Amit,");
    expect(email.text).toContain("Dinner");
    expect(email.text).toContain("Party of 2");
    expect(email.text).toContain(sample.bookingUrl);
    expect(email.html).toContain(sample.bookingUrl);
    expect(email.html).toContain("Book on Resy");
  });

  it("falls back when the diner has no first name", () => {
    const email = renderAlertEmail({ ...sample, firstName: null });

    expect(email.text.startsWith("Hi,")).toBe(true);
  });

  it("escapes HTML in the restaurant name", () => {
    const email = renderAlertEmail({
      ...sample,
      restaurantName: 'Minetta <script>alert("x")</script>',
    });

    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});

describe("cronAuthorized", () => {
  const secret = "test-cron-secret";

  it("accepts the Vercel-style Bearer header", () => {
    const request = new Request("http://localhost/api/cron/alerts", {
      headers: { authorization: `Bearer ${secret}` },
    });

    expect(cronAuthorized(request, secret)).toBe(true);
  });

  it("rejects a missing or wrong secret", () => {
    const request = new Request("http://localhost/api/cron/alerts");

    expect(cronAuthorized(request, secret)).toBe(false);
    expect(cronAuthorized(request, "")).toBe(false);
    expect(
      cronAuthorized(
        new Request("http://localhost/api/cron/alerts", {
          headers: { authorization: "Bearer other" },
        }),
        secret,
      ),
    ).toBe(false);
  });
});
