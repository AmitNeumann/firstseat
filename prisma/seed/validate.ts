/**
 * Validation for hand-entered restaurant data.
 *
 * The seed file is written by a human pasting values off a booking site, so it is treated
 * like any other untrusted input: parsed by Zod before it is allowed anywhere near the
 * database. A typo here is worse than a typo in a form, because a wrong `releaseTime`
 * produces alerts that fire at the wrong moment and look perfectly normal while doing it.
 */

import * as z from "zod";

import { Platform } from "../../src/generated/prisma/enums";
import { TIME_OF_DAY_PATTERN, isRegionTimezone } from "../../src/lib/time";
import { TODO, type RestaurantSeed } from "./types";

/**
 * The hostname each platform's booking links live on. Used to cross-check the pasted URL
 * against the chosen platform, which catches the easy mistake of picking `RESY` from the
 * list and then pasting a Tock link.
 *
 * `DIRECT` and `OTHER` are intentionally absent: they mean "the restaurant's own site",
 * which can be any hostname.
 */
const PLATFORM_HOSTNAMES: Partial<Record<Platform, string>> = {
  [Platform.RESY]: "resy.com",
  [Platform.TOCK]: "exploretock.com",
  [Platform.OPENTABLE]: "opentable.com",
  [Platform.SEVENROOMS]: "sevenrooms.com",
};

function hostMatches(hostname: string, expected: string): boolean {
  return hostname === expected || hostname.endsWith(`.${expected}`);
}

/** Rejects a value that is still the placeholder, whatever its position in the object. */
const notPlaceholder = z.string().refine((value) => value.trim() !== TODO, {
  error: "Still set to TODO — look this value up and paste the real one.",
});

const bookingUrlField = notPlaceholder.pipe(
  z
    .string()
    .trim()
    .refine(
      (value) => {
        try {
          // Alerts link straight to this URL, so anything but https would send the user
          // to a page a network attacker can rewrite.
          return new URL(value).protocol === "https:";
        } catch {
          return false;
        }
      },
      { error: "Must be a full https:// URL copied from the booking page." },
    ),
);

const releaseRuleSchema = z
  .object({
    platform: z.enum(Platform),

    daysInAdvance: z
      .number()
      .int({ error: "Whole days only." })
      // A booking window is days or weeks. Anything outside this is a typo, most likely
      // a date pasted where a day count belongs.
      .min(1, { error: "Must be at least 1 day ahead." })
      .max(365, { error: "More than a year ahead is almost certainly a typo." }),

    releaseTime: notPlaceholder.pipe(
      z.string().regex(TIME_OF_DAY_PATTERN, {
        error: 'Use 24-hour "HH:MM", e.g. "00:00" for midnight or "09:30".',
      }),
    ),

    timezone: z.string().refine(isRegionTimezone, {
      error:
        'Use a place-based IANA name like "America/New_York". Fixed-offset names such as "EST" never observe daylight saving, so half the year\'s drops would be an hour out.',
    }),

    bookingUrl: bookingUrlField,
  })
  .superRefine((rule, ctx) => {
    const expected = PLATFORM_HOSTNAMES[rule.platform];

    if (!expected) {
      return;
    }

    let hostname: string;

    try {
      hostname = new URL(rule.bookingUrl).hostname.toLowerCase();
    } catch {
      return; // Already reported by bookingUrlField.
    }

    if (!hostMatches(hostname, expected)) {
      ctx.addIssue({
        code: "custom",
        path: ["bookingUrl"],
        message: `Platform is ${rule.platform}, so the link should be on ${expected}, but this one is on ${hostname}.`,
      });
    }
  });

export const RestaurantSeedSchema = z.object({
  name: z.string().trim().min(1, { error: "A restaurant needs a name." }),
  city: z.string().trim().min(1, { error: "A restaurant needs a city." }),
  releaseRule: releaseRuleSchema,
  source: notPlaceholder.pipe(
    z
      .string()
      .trim()
      // Long enough to actually say where and when, not just "resy".
      .min(10, {
        error: "Say where you saw the rule and when you checked it.",
      }),
  ),
});

export type ValidRestaurantSeed = z.infer<typeof RestaurantSeedSchema>;

/** Flattens Zod's error tree into "field: message" lines for the console report. */
export function formatIssues(error: z.ZodError<RestaurantSeed>): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".");

    return path ? `${path}: ${issue.message}` : issue.message;
  });
}
