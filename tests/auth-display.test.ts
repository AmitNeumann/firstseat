import { describe, expect, it } from "vitest";

import { avatarInitials, displayFullName, greetingFirstName } from "@/lib/auth/display";
import { SignupSchema, UpdateNameSchema } from "@/lib/auth/schemas";

describe("avatarInitials", () => {
  it("uses first and last initials when both names are set", () => {
    expect(
      avatarInitials({ firstName: "Amit", lastName: "Neumann", email: "amit@example.com" }),
    ).toBe("AN");
  });

  it("uses the first name only when there is no last name", () => {
    expect(
      avatarInitials({ firstName: "Amit", lastName: null, email: "amit@example.com" }),
    ).toBe("A");
  });

  it("uses the last name only when there is no first name", () => {
    expect(
      avatarInitials({ firstName: null, lastName: "Neumann", email: "amit@example.com" }),
    ).toBe("N");
  });

  it("falls back to the email letter when no name is set", () => {
    expect(
      avatarInitials({ firstName: null, lastName: null, email: "amit@example.com" }),
    ).toBe("A");
  });

  it("treats whitespace-only names as missing", () => {
    expect(
      avatarInitials({ firstName: "  ", lastName: "  ", email: "sam@example.com" }),
    ).toBe("S");
  });
});

describe("greetingFirstName", () => {
  it("returns the trimmed first name", () => {
    expect(greetingFirstName("  Amit  ")).toBe("Amit");
  });

  it("returns null when no name is set, so the greeting is omitted", () => {
    expect(greetingFirstName(null)).toBeNull();
    expect(greetingFirstName("")).toBeNull();
    expect(greetingFirstName("   ")).toBeNull();
  });
});

describe("displayFullName", () => {
  it("joins first and last name", () => {
    expect(displayFullName({ firstName: "Amit", lastName: "Neumann" })).toBe("Amit Neumann");
  });

  it("uses whichever name is set", () => {
    expect(displayFullName({ firstName: "Amit", lastName: null })).toBe("Amit");
    expect(displayFullName({ firstName: null, lastName: "Neumann" })).toBe("Neumann");
  });

  it("returns null when no name is set, so the menu can show only the email", () => {
    expect(displayFullName({ firstName: null, lastName: null })).toBeNull();
    expect(displayFullName({ firstName: "  ", lastName: "" })).toBeNull();
  });
});

describe("UpdateNameSchema", () => {
  it("stores empty fields as null", () => {
    const parsed = UpdateNameSchema.safeParse({ firstName: "  ", lastName: "" });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data).toEqual({ firstName: null, lastName: null });
  });

  it("trims names", () => {
    const parsed = UpdateNameSchema.safeParse({ firstName: " Amit ", lastName: " Neumann " });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data).toEqual({
      firstName: "Amit",
      lastName: "Neumann",
    });
  });

  it("rejects a name longer than 40 characters", () => {
    const parsed = UpdateNameSchema.safeParse({
      firstName: "A".repeat(41),
      lastName: "",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("SignupSchema names", () => {
  const base = {
    email: "amit@example.com",
    password: "longenough",
    timezone: "Asia/Jerusalem",
  };

  it("accepts a first and last name", () => {
    const parsed = SignupSchema.safeParse({
      ...base,
      firstName: " Amit ",
      lastName: "Neumann",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.firstName).toBe("Amit");
    expect(parsed.success && parsed.data.lastName).toBe("Neumann");
  });

  it("stores missing names as null so greeting and initials can fall back", () => {
    const parsed = SignupSchema.safeParse({
      ...base,
      firstName: "",
      lastName: "  ",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.firstName).toBeNull();
    expect(parsed.success && parsed.data.lastName).toBeNull();
  });
});
