import * as z from "zod";

import { Meal } from "@/generated/prisma/enums";
import { CIVIL_DATE_PATTERN, parseCivilDate } from "@/lib/time";

/**
 * Validation for the watch form.
 *
 * The browser also validates — a `<select>` only offers real options and `<input
 * type="date">` only offers real dates — but none of that is a check. A form submission is
 * an HTTP request, and anyone can send one with any body. These rules are the ones that
 * count, because they run on the server.
 *
 * The schema deliberately stops at "is this a well-formed request". Whether the restaurant
 * exists, whether we know its release schedule, and whether that date has already opened
 * are questions only the database can answer, so they live in the action.
 */

/** The largest party a restaurant reservation system will normally take online. */
export const MAX_PARTY_SIZE = 20;

/** Roughly the furthest ahead any restaurant releases, plus room to spare. */
export const MAX_DAYS_AHEAD = 400;

export const CreateWatchSchema = z.object({
  restaurantId: z.uuid({ error: "Choose a restaurant from the list." }),

  targetDate: z
    .string()
    .trim()
    .regex(CIVIL_DATE_PATTERN, { error: "Choose a date." })
    // The pattern alone would accept 2026-02-31, which the browser date picker cannot
    // produce but a hand-made request can.
    .refine((value) => parseCivilDate(value) !== null, {
      error: "That date does not exist.",
    }),

  partySize: z.coerce
    .number({ error: "Choose how many people." })
    .int({ error: "Whole people only." })
    .min(1, { error: "At least one person." })
    .max(MAX_PARTY_SIZE, {
      error: `Most restaurants cap online bookings at ${MAX_PARTY_SIZE}; call them for a larger party.`,
    }),

  meal: z.enum(Meal, { error: "Choose a meal." }),
});

export type CreateWatchInput = z.infer<typeof CreateWatchSchema>;

/**
 * Editing a watch changes the date, party size or meal. The restaurant is not editable:
 * pointing an existing watch at a different restaurant makes it a different watch, and
 * keeping it fixed means the alerts always belong to rules the watch already used.
 *
 * Built from the create schema rather than repeated, so a rule tightened in one place
 * cannot quietly stay loose in the other.
 */
export const UpdateWatchSchema = CreateWatchSchema.omit({ restaurantId: true }).extend({
  watchId: z.uuid(),
});

export type UpdateWatchInput = z.infer<typeof UpdateWatchSchema>;

export const CancelWatchSchema = z.object({
  watchId: z.uuid(),
});

export type WatchFormState =
  | {
      /** Per-field validation messages, keyed by input `name`. */
      errors?: {
        restaurantId?: string[];
        targetDate?: string[];
        partySize?: string[];
        meal?: string[];
        /** Only reachable by a hand-made request; the edit form fills this in itself. */
        watchId?: string[];
      };
      /** A whole-form failure, e.g. a duplicate watch or a window that already opened. */
      message?: string;
      /**
       * A booking link shown alongside `message`. Set when the window for that date has
       * already opened: a watch is useless by then, but the user can still go and book.
       */
      bookingUrl?: string;
      /** Echoed back so a failed submit does not clear what the user chose. */
      values?: {
        restaurantId?: string;
        targetDate?: string;
        partySize?: string;
        meal?: string;
      };
    }
  | undefined;
