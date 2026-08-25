import { describe, expect, it } from "vitest";

import { UpdateTimezoneSchema } from "@/lib/auth/schemas";
import { listIanaTimezones } from "@/lib/time";

describe("listIanaTimezones", () => {
  it("includes the user's zone so Settings can default to it", () => {
    expect(listIanaTimezones()).toContain("Asia/Jerusalem");
  });
});

describe("UpdateTimezoneSchema", () => {
  it("accepts a real IANA zone", () => {
    expect(UpdateTimezoneSchema.safeParse({ timezone: "Asia/Jerusalem" }).success).toBe(
      true,
    );
  });

  it("rejects an unknown zone", () => {
    expect(UpdateTimezoneSchema.safeParse({ timezone: "Not/AZone" }).success).toBe(false);
  });
});
