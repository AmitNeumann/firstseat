import { describe, expect, it } from "vitest";

import { confirmErrorMessage } from "@/lib/auth/confirm-errors";
import { namesFromAuthMetadata } from "@/lib/auth/oauth-profile";
import { safeNextPath } from "@/lib/auth/safe-redirect";

describe("namesFromAuthMetadata", () => {
  it("prefers email-signup firstName and lastName", () => {
    expect(
      namesFromAuthMetadata({
        firstName: "Amit",
        lastName: "Neumann",
        full_name: "Other Person",
      }),
    ).toEqual({ firstName: "Amit", lastName: "Neumann" });
  });

  it("reads Google given_name and family_name", () => {
    expect(
      namesFromAuthMetadata({
        given_name: "Amit",
        family_name: "Neumann",
      }),
    ).toEqual({ firstName: "Amit", lastName: "Neumann" });
  });

  it("splits Google full_name when the parts are missing", () => {
    expect(namesFromAuthMetadata({ full_name: "Amit Neumann" })).toEqual({
      firstName: "Amit",
      lastName: "Neumann",
    });
  });

  it("keeps a single Google name as the first name", () => {
    expect(namesFromAuthMetadata({ name: "Amit" })).toEqual({
      firstName: "Amit",
      lastName: null,
    });
  });

  it("ignores an email-like name field", () => {
    expect(namesFromAuthMetadata({ name: "amit@example.com" })).toEqual({
      firstName: null,
      lastName: null,
    });
  });

  it("clips names to 40 characters", () => {
    const long = "A".repeat(50);

    expect(namesFromAuthMetadata({ given_name: long }).firstName).toBe("A".repeat(40));
  });
});

describe("safeNextPath", () => {
  it("defaults to the dashboard", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath("")).toBe("/dashboard");
  });

  it("rejects open redirects", () => {
    expect(safeNextPath("//evil.example.com")).toBe("/dashboard");
    expect(safeNextPath("https://evil.example.com")).toBe("/dashboard");
  });

  it("allows a same-site path", () => {
    expect(safeNextPath("/settings")).toBe("/settings");
  });

  it("allows the password-reset landing path", () => {
    expect(safeNextPath("/reset-password")).toBe("/reset-password");
  });
});

describe("confirmErrorMessage", () => {
  it("maps Google OAuth failures without echoing the query string", () => {
    expect(confirmErrorMessage("oauth_denied")).toContain("cancelled");
    expect(confirmErrorMessage("oauth_failed")).toContain("did not complete");
    expect(confirmErrorMessage("reset_expired")).toContain("expired");
    expect(confirmErrorMessage("<script>")).toContain("could not confirm");
  });
});
