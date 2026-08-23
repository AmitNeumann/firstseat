/**
 * Tests for the booking-platform registry.
 *
 * `platform` used to be a Postgres enum, which made the set of valid values a schema
 * concern. It is now open-ended text, so these tests are what hold the line: the shape is
 * still constrained, the same platform written three ways still lands on one slug, and the
 * URL cross-check still applies to the platforms we know.
 */

import { describe, expect, it } from "vitest";

import {
  KNOWN_PLATFORM_SLUGS,
  MAX_PLATFORM_LENGTH,
  PLATFORM_SLUG_PATTERN,
  hostMatches,
  isPlatformSlug,
  platformHostname,
  platformLabel,
  toPlatformSlug,
} from "@/lib/watches/platforms";

describe("toPlatformSlug", () => {
  it.each([
    ["Resy", "resy"],
    ["RESY", "resy"],
    ["  Resy  ", "resy"],
    ["SevenRooms", "sevenrooms"],
    ["Seven Rooms", "seven-rooms"],
    ["DoorDash", "doordash"],
    ["OpenTable", "opentable"],
    ["Table Check", "table-check"],
    ["table_check", "table-check"],
  ])("turns %s into %s", (written, slug) => {
    expect(toPlatformSlug(written)).toBe(slug);
  });
});

describe("isPlatformSlug", () => {
  it.each([["resy"], ["sevenrooms"], ["table-check"], ["opentable2"]])(
    "accepts %s",
    (slug) => {
      expect(isPlatformSlug(slug)).toBe(true);
    },
  );

  it.each([
    ["", "empty"],
    ["Resy", "not lowercased"],
    ["seven rooms", "contains a space"],
    ["resy!", "punctuation"],
    ["resy.com", "a dot"],
    ["-resy", "a leading hyphen"],
    ["resy-", "a trailing hyphen"],
    ["resy--x", "a double hyphen"],
    ["<script>", "markup"],
    ["resy'; drop table--", "an injection attempt"],
  ])("rejects %s (%s)", (slug) => {
    expect(isPlatformSlug(slug)).toBe(false);
  });

  it("rejects anything longer than the column allows", () => {
    expect(isPlatformSlug("a".repeat(MAX_PLATFORM_LENGTH))).toBe(true);
    expect(isPlatformSlug("a".repeat(MAX_PLATFORM_LENGTH + 1))).toBe(false);
  });

  it("agrees with the pattern the database CHECK constraint uses", () => {
    // The constraint in the migration is written out as SQL, so this is the closest we can
    // get to asserting the two have not drifted apart.
    expect(PLATFORM_SLUG_PATTERN.source).toBe("^[a-z0-9]+(-[a-z0-9]+)*$");
  });

  it("every platform we ship is itself a valid slug", () => {
    for (const slug of KNOWN_PLATFORM_SLUGS) {
      expect(isPlatformSlug(slug)).toBe(true);
    }
  });
});

describe("platformLabel", () => {
  it("uses the written-out name for platforms we recognise", () => {
    expect(platformLabel("resy")).toBe("Resy");
    expect(platformLabel("sevenrooms")).toBe("SevenRooms");
    expect(platformLabel("doordash")).toBe("DoorDash");
    expect(platformLabel("opentable")).toBe("OpenTable");
  });

  it("humanises a platform we have never seen rather than showing a raw slug", () => {
    expect(platformLabel("table-check")).toBe("Table check");
    expect(platformLabel("newthing")).toBe("Newthing");
  });

  it("reads correctly in the sentence it appears in", () => {
    // Rendered as "Opens on {label}", so these have to be phrases, not names.
    expect(`Opens on ${platformLabel("direct")}`).toBe(
      "Opens on the restaurant's own site",
    );
    expect(`Opens on ${platformLabel("other")}`).toBe("Opens on another platform");
  });
});

describe("platformHostname", () => {
  it("knows the host for the platforms we hardcoded", () => {
    expect(platformHostname("resy")).toBe("resy.com");
    expect(platformHostname("tock")).toBe("exploretock.com");
    expect(platformHostname("doordash")).toBe("doordash.com");
  });

  it("has no opinion about a restaurant's own site", () => {
    expect(platformHostname("direct")).toBeUndefined();
    expect(platformHostname("other")).toBeUndefined();
  });

  it("has no opinion about a platform we do not recognise", () => {
    // This is what makes an unknown platform usable: nothing to check against means no
    // check, rather than a rejection.
    expect(platformHostname("table-check")).toBeUndefined();
  });
});

describe("hostMatches", () => {
  it("accepts the host itself and its subdomains", () => {
    expect(hostMatches("resy.com", "resy.com")).toBe(true);
    expect(hostMatches("www.resy.com", "resy.com")).toBe(true);
  });

  it("rejects a lookalike host that merely ends with the same text", () => {
    // "notresy.com" ends with "resy.com" as a string. Requiring a dot before it is what
    // stops an attacker-registered domain passing the check.
    expect(hostMatches("notresy.com", "resy.com")).toBe(false);
    expect(hostMatches("resy.com.evil.example", "resy.com")).toBe(false);
  });
});
