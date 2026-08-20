"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

import { DropAlertStatus, WatchStatus } from "@/generated/prisma/enums";
import { requireAppUser } from "@/lib/auth/dal";
import { field } from "@/lib/form-data";
import { prisma } from "@/lib/prisma";
import { civilDateInZone, compareCivilDates, formatCivilDate, parseCivilDate } from "@/lib/time";
import { computeDropMoment, DEFAULT_ALERT_LEAD_MINUTES } from "@/lib/watches/drop-time";
import { formatInstant } from "@/lib/watches/format";
import {
  CancelWatchSchema,
  CreateWatchSchema,
  MAX_DAYS_AHEAD,
  type WatchFormState,
} from "@/lib/watches/schemas";

/**
 * Prisma's unique-constraint error. Duck-typed rather than imported so this does not
 * depend on where the generated client puts its error classes.
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export async function createWatch(
  _previousState: WatchFormState,
  formData: FormData,
): Promise<WatchFormState> {
  // First line of every action that touches user data. Redirects to /login if nobody is
  // signed in, and gives us the id that scopes the write below.
  const user = await requireAppUser();

  const submitted = {
    restaurantId: field(formData, "restaurantId"),
    targetDate: field(formData, "targetDate"),
    partySize: field(formData, "partySize"),
    meal: field(formData, "meal"),
  };

  const parsed = CreateWatchSchema.safeParse(submitted);

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      values: submitted,
    };
  }

  const { restaurantId, targetDate, partySize, meal } = parsed.data;

  // Public reference data, so no user scoping — but it must exist. The id arrived in a
  // form body, which anyone can write by hand.
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      releaseRules: {
        select: {
          id: true,
          platform: true,
          daysInAdvance: true,
          releaseTime: true,
          timezone: true,
          bookingUrl: true,
        },
      },
    },
  });

  if (!restaurant) {
    return {
      errors: { restaurantId: ["We don't track that restaurant."] },
      values: submitted,
    };
  }

  if (restaurant.releaseRules.length === 0) {
    return {
      message: `We don't know ${restaurant.name}'s release schedule yet, so we can't work out when to alert you.`,
      values: submitted,
    };
  }

  const now = new Date();

  // Which day it is depends on where you are, and a table on the 24th means the 24th in
  // the restaurant's city — so its own timezone decides whether the date has passed.
  const restaurantZone = restaurant.releaseRules[0].timezone;
  const today = civilDateInZone(now, restaurantZone);
  const target = parseCivilDate(targetDate)!;

  if (compareCivilDates(target, today) < 0) {
    return {
      errors: { targetDate: ["That date has already passed."] },
      values: submitted,
    };
  }

  const latestSensible = civilDateInZone(
    new Date(now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000),
    restaurantZone,
  );

  if (compareCivilDates(target, latestSensible) > 0) {
    return {
      errors: {
        targetDate: [
          `No restaurant releases tables that far ahead. Try a date before ${formatCivilDate(latestSensible)}.`,
        ],
      },
      values: submitted,
    };
  }

  // One alert per release rule, i.e. one per platform the restaurant releases on. The
  // calculation is pure and separately tested; this is just where it gets applied.
  const alerts = restaurant.releaseRules.map((rule) => ({
    rule,
    moment: computeDropMoment({
      targetDate,
      rule: {
        daysInAdvance: rule.daysInAdvance,
        releaseTime: toTimeOfDayString(rule.releaseTime),
        timezone: rule.timezone,
      },
      alertLeadMinutes: DEFAULT_ALERT_LEAD_MINUTES,
    }),
  }));

  const stillToCome = alerts.filter(({ moment }) => moment.dropDatetime > now);

  if (stillToCome.length === 0) {
    // Every window for this date has already opened. A watch cannot help now, but a link
    // straight to the booking page still can.
    const [earliest] = [...alerts].sort(
      (a, b) => a.moment.dropDatetime.getTime() - b.moment.dropDatetime.getTime(),
    );

    return {
      message: `Bookings for ${restaurant.name} on that date already opened at ${formatInstant(earliest.moment.dropDatetime, user.timezone)} your time, so an alert would come too late.`,
      bookingUrl: earliest.rule.bookingUrl,
      values: submitted,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const watch = await tx.watch.create({
        // userId comes from requireAppUser, never from the form. A watch cannot be
        // created on someone else's behalf even if the request says otherwise.
        data: { userId: user.id, restaurantId: restaurant.id, targetDate: new Date(`${targetDate}T00:00:00.000Z`), partySize, meal },
        select: { id: true },
      });

      await tx.dropAlert.createMany({
        data: alerts.map(({ rule, moment }) => ({
          watchId: watch.id,
          releaseRuleId: rule.id,
          platform: rule.platform,
          dropDatetime: moment.dropDatetime,
          alertAt: moment.alertAt,
          // Copied rather than joined, so the link in a sent alert stays what it was even
          // if the rule is later corrected.
          bookingUrl: rule.bookingUrl,
          status:
            moment.dropDatetime > now ? DropAlertStatus.SCHEDULED : DropAlertStatus.MISSED,
        })),
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      // The @@unique on (userId, restaurantId, targetDate, partySize, meal) means the
      // database itself refuses a second identical watch. Turned into a readable message
      // rather than a 500.
      return {
        message: "You are already watching that restaurant for that date, party and meal.",
        values: submitted,
      };
    }

    throw error;
  }

  revalidatePath("/dashboard");
  // Outside the try: redirect() works by throwing, so catching around it would swallow
  // the navigation and look like a failure.
  redirect("/dashboard");
}

export async function cancelWatch(formData: FormData): Promise<void> {
  const user = await requireAppUser();

  const parsed = CancelWatchSchema.safeParse({ watchId: field(formData, "watchId") });

  if (!parsed.success) {
    return;
  }

  const { watchId } = parsed.data;

  await prisma.$transaction(async (tx) => {
    // `updateMany` with userId in the where clause makes the permission check and the
    // write a single statement: a watch belonging to someone else simply matches nothing.
    // A findUnique-then-update would be two statements with a gap in between, and it
    // would be possible to forget the check in the second one.
    const { count } = await tx.watch.updateMany({
      where: { id: watchId, userId: user.id, status: WatchStatus.ACTIVE },
      data: { status: WatchStatus.CANCELLED },
    });

    if (count === 0) {
      return;
    }

    await tx.dropAlert.updateMany({
      where: {
        watchId,
        watch: { userId: user.id },
        status: DropAlertStatus.SCHEDULED,
      },
      data: { status: DropAlertStatus.CANCELLED },
    });
  });

  revalidatePath("/dashboard");
}

/**
 * Postgres `time` columns come back as a `Date` whose date part is meaningless. Only the
 * UTC hours and minutes carry the stored value.
 */
function toTimeOfDayString(releaseTime: Date): string {
  const hours = String(releaseTime.getUTCHours()).padStart(2, "0");
  const minutes = String(releaseTime.getUTCMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}
