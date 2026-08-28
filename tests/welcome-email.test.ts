/**
 * Welcome email copy, without calling Resend.
 */

import { describe, expect, it } from "vitest";

import { renderWelcomeEmail } from "@/lib/alerts/welcome";

const sample = {
  firstName: "Amit",
  origin: "https://firstseat-lemon.vercel.app",
};

describe("renderWelcomeEmail", () => {
  it("explains FirstSeat and links to create a watch", () => {
    const email = renderWelcomeEmail(sample);

    expect(email.subject).toBe("Welcome to FirstSeat");
    expect(email.text).toContain("Hi Amit,");
    expect(email.text).toContain("hardest restaurant tables");
    expect(email.text).toContain(`${sample.origin}/watches/new`);
    expect(email.html).toContain(`${sample.origin}/watches/new`);
    expect(email.html).toContain("Create a watch");
  });

  it("falls back when the diner has no first name", () => {
    const email = renderWelcomeEmail({ ...sample, firstName: null });

    expect(email.text.startsWith("Hi,")).toBe(true);
  });

  it("escapes HTML in the greeting name", () => {
    const email = renderWelcomeEmail({
      ...sample,
      firstName: '<script>alert("x")</script>',
    });

    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});
