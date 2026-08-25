/**
 * Validation for hand-entered restaurant data.
 *
 * The seed file is written by a human pasting values off a booking site, so it is treated
 * like any other untrusted input: parsed by Zod before it is allowed anywhere near the
 * database. A typo here is worse than a typo in a form, because a wrong `releaseTime`
 * produces alerts that fire at the wrong moment and look perfectly normal while doing it.
 */

import * as z from "zod";

import { TIME_OF_DAY_PATTERN, isRegionTimezone } from "../../src/lib/time";
import {
  MAX_PLATFORM_LENGTH,
  hostMatches,
  isPlatformSlug,
  platformHostname,
  platformLabel,
  toPlatformSlug,
} from "../../src/lib/watches/platforms";
import { TODO, type RestaurantSeed } from "./types";

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

/**
 * Any booking platform is allowed, but only in one canonical form.
 *
 * `transform` runs before the check, so "SevenRooms", "sevenrooms" and "Seven Rooms" all
 * become "sevenrooms" rather than being rejected or, worse, stored as three different
 * platforms — which would defeat the one-rule-per-platform constraint in the database.
 */
const platformField = notPlaceholder.pipe(
  z
    .string()
    .transform(toPlatformSlug)
    .refine(isPlatformSlug, {
      error: `Use letters and numbers, e.g. "Resy" or "Table Check" (max ${MAX_PLATFORM_LENGTH} characters). Punctuation other than a hyphen is not allowed.`,
    }),
);

const releaseRuleSchema = z
  .object({
    platform: platformField,

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
  // Cross-checks the pasted URL against the platform, which catches the easy mistake of
  // writing "Resy" and then pasting a Tock link.
  //
  // Only platforms we have hardcoded a host for are checked. A platform we have never seen
  // is accepted as-is: we have nothing to compare it against, and refusing it would make
  // adding a restaurant on a new platform impossible.
  .superRefine((rule, ctx) => {
    const expected = platformHostname(rule.platform);

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
        message: `Platform is ${platformLabel(rule.platform)}, so the link should be on ${expected}, but this one is on ${hostname}.`,
      });
    }
  });

export const RestaurantSeedSchema = z.object({
  name: z.string().trim().min(1, { error: "A restaurant needs a name." }),
  city: z.string().trim().min(1, { error: "A restaurant needs a city." }),
  imageUrl: z
    .string()
    .trim()
    .regex(/^\/restaurants\/[a-z0-9][a-z0-9._-]*\.(jpg|jpeg|png|webp)$/i, {
      error:
        "Use a path like /restaurants/minetta-tavern.jpg (a file under public/restaurants/).",
    })
    .optional(),
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
