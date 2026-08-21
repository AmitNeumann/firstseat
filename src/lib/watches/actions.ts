"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

import { DropAlertStatus, WatchStatus, type Platform } from "@/generated/prisma/enums";
import { requireAppUser } from "@/lib/auth/dal";
import { field } from "@/lib/form-data";
import { prisma } from "@/lib/prisma";
import {
  civilDateInZone,
  compareCivilDates,
  formatCivilDate,
  parseCivilDate,
  timeOfDayFromDate,
} from "@/lib/time";
import { computeDropMoment, DEFAULT_ALERT_LEAD_MINUTES } from "@/lib/watches/drop-time";
import { formatInstant } from "@/lib/watches/format";
import {
  CancelWatchSchema,
  CreateWatchSchema,
  MAX_DAYS_AHEAD,
  UpdateWatchSchema,
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

/** A `date` column is stored at UTC midnight, so both writes and lookups agree on it. */
function toDateColumn(targetDate: string): Date {
  return new Date(`${targetDate}T00:00:00.000Z`);
}

/** The columns of a release rule that scheduling needs. */
type ReleaseRuleRow = {
  id: string;
  platform: Platform;
  daysInAdvance: number;
  releaseTime: Date;
  timezone: string;
  bookingUrl: string;
};

/** A row to write into `drop_alerts`, minus the `watchId` the caller supplies. */
type PlannedAlert = {
  releaseRuleId: string;
  platform: Platform;
  dropDatetime: Date;
  alertAt: Date;
  bookingUrl: string;
  status: DropAlertStatus;
};

/**
 * The rules that decide whether a date can be watched, and what alerts it produces.
 *
 * Shared by create and edit so the two cannot disagree — a check added here applies to
 * both, which is the point. Returns either the alerts to write, or the form state to
 * show the user instead.
 */
function planAlerts({
  restaurantName,
  rules,
  targetDate,
  now,
  userTimezone,
}: {
  restaurantName: string;
  rules: ReleaseRuleRow[];
  targetDate: string;
  now: Date;
  userTimezone: string;
}): { ok: true; alerts: PlannedAlert[] } | { ok: false; state: NonNullable<WatchFormState> } {
  if (rules.length === 0) {
    return {
      ok: false,
      state: {
        message: `We don't know ${restaurantName}'s release schedule yet, so we can't work out when to alert you.`,
      },
    };
  }

  // Which day it is depends on where you are, and a table on the 24th means the 24th in
  // the restaurant's city — so its own timezone decides whether the date has passed.
  const restaurantZone = rules[0].timezone;
  const today = civilDateInZone(now, restaurantZone);
  const target = parseCivilDate(targetDate);

  if (!target) {
    return { ok: false, state: { errors: { targetDate: ["That date does not exist."] } } };
  }

  if (compareCivilDates(target, today) < 0) {
    return { ok: false, state: { errors: { targetDate: ["That date has already passed."] } } };
  }

  const latestSensible = civilDateInZone(
    new Date(now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000),
    restaurantZone,
  );

  if (compareCivilDates(target, latestSensible) > 0) {
    return {
      ok: false,
      state: {
        errors: {
          targetDate: [
            `No restaurant releases tables that far ahead. Try a date before ${formatCivilDate(latestSensible)}.`,
          ],
        },
      },
    };
  }

  // One alert per release rule, i.e. one per platform the restaurant releases on. The
  // calculation is pure and separately tested; this is just where it gets applied.
  const planned = rules.map((rule) => ({
    rule,
    moment: computeDropMoment({
      targetDate,
      rule: {
        daysInAdvance: rule.daysInAdvance,
        releaseTime: timeOfDayFromDate(rule.releaseTime),
        timezone: rule.timezone,
      },
      alertLeadMinutes: DEFAULT_ALERT_LEAD_MINUTES,
    }),
  }));

  const stillToCome = planned.filter(({ moment }) => moment.dropDatetime > now);

  if (stillToCome.length === 0) {
    // Every window for this date has already opened. A watch cannot help now, but a link
    // straight to the booking page still can.
    const [earliest] = [...planned].sort(
      (a, b) => a.moment.dropDatetime.getTime() - b.moment.dropDatetime.getTime(),
    );

    return {
      ok: false,
      state: {
        message: `Bookings for ${restaurantName} on that date already opened at ${formatInstant(earliest.moment.dropDatetime, userTimezone)} your time, so an alert would come too late.`,
        bookingUrl: earliest.rule.bookingUrl,
      },
    };
  }

  return {
    ok: true,
    alerts: planned.map(({ rule, moment }) => ({
      releaseRuleId: rule.id,
      platform: rule.platform,
      dropDatetime: moment.dropDatetime,
      alertAt: moment.alertAt,
      // Copied rather than joined, so the link in a sent alert stays what it was even if
      // the rule is later corrected.
      bookingUrl: rule.bookingUrl,
      status:
        moment.dropDatetime > now ? DropAlertStatus.SCHEDULED : DropAlertStatus.MISSED,
    })),
  };
}

const releaseRuleSelect = {
  id: true,
  platform: true,
  daysInAdvance: true,
  releaseTime: true,
  timezone: true,
  bookingUrl: true,
} as const;

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
    return { errors: z.flattenError(parsed.error).fieldErrors, values: submitted };
  }

  const { restaurantId, targetDate, partySize, meal } = parsed.data;

  // Public reference data, so no user scoping — but it must exist. The id arrived in a
  // form body, which anyone can write by hand.
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true, releaseRules: { select: releaseRuleSelect } },
  });

  if (!restaurant) {
    return {
      errors: { restaurantId: ["We don't track that restaurant."] },
      values: submitted,
    };
  }

  const plan = planAlerts({
    restaurantName: restaurant.name,
    rules: restaurant.releaseRules,
    targetDate,
    now: new Date(),
    userTimezone: user.timezone,
  });

  if (!plan.ok) {
    return { ...plan.state, values: submitted };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const watch = await tx.watch.create({
        // userId comes from requireAppUser, never from the form. A watch cannot be
        // created on someone else's behalf even if the request says otherwise.
        data: {
          userId: user.id,
          restaurantId: restaurant.id,
          targetDate: toDateColumn(targetDate),
          partySize,
          meal,
        },
        select: { id: true },
      });

      await tx.dropAlert.createMany({
        data: plan.alerts.map((alert) => ({ ...alert, watchId: watch.id })),
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

/**
 * Change the date, party size or meal of an existing watch.
 *
 * The restaurant is deliberately not editable: changing it would make this a different
 * watch entirely, and the user can create one. Keeping it fixed also means the alerts
 * always belong to release rules the watch already pointed at.
 */
export async function updateWatch(
  _previousState: WatchFormState,
  formData: FormData,
): Promise<WatchFormState> {
  const user = await requireAppUser();

  const submitted = {
    targetDate: field(formData, "targetDate"),
    partySize: field(formData, "partySize"),
    meal: field(formData, "meal"),
  };

  const parsed = UpdateWatchSchema.safeParse({
    ...submitted,
    watchId: field(formData, "watchId"),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values: submitted };
  }

  const { watchId, targetDate, partySize, meal } = parsed.data;

  // Scoped by userId, so someone else's watch is simply not found. The response is the
  // same whether the watch belongs to another account or does not exist at all, which is
  // what stops this being a way to discover which ids are real.
  const existing = await prisma.watch.findFirst({
    where: { id: watchId, userId: user.id, status: WatchStatus.ACTIVE },
    select: {
      id: true,
      targetDate: true,
      restaurant: {
        select: { name: true, releaseRules: { select: releaseRuleSelect } },
      },
    },
  });

  if (!existing) {
    return { message: "That watch no longer exists.", values: submitted };
  }

  // Party size and meal have no effect on when tables are released, so the alerts only
  // need rebuilding when the date moves.
  const dateChanged = existing.targetDate.toISOString().slice(0, 10) !== targetDate;

  const plan = planAlerts({
    restaurantName: existing.restaurant.name,
    rules: existing.restaurant.releaseRules,
    targetDate,
    now: new Date(),
    userTimezone: user.timezone,
  });

  if (!plan.ok) {
    return { ...plan.state, values: submitted };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // updateMany rather than update: the userId stays in the where clause, so the
      // permission check and the write remain a single statement.
      await tx.watch.updateMany({
        where: { id: watchId, userId: user.id, status: WatchStatus.ACTIVE },
        data: { targetDate: toDateColumn(targetDate), partySize, meal },
      });

      if (!dateChanged) {
        return;
      }

      // Cancelled rather than deleted. An alert is a record of something we scheduled,
      // and one that has already been sent is history we should not rewrite — so the old
      // rows are marked cancelled and a fresh set is scheduled alongside them.
      await tx.dropAlert.updateMany({
        where: {
          watchId,
          watch: { userId: user.id },
          status: DropAlertStatus.SCHEDULED,
        },
        data: { status: DropAlertStatus.CANCELLED },
      });

      await tx.dropAlert.createMany({
        data: plan.alerts.map((alert) => ({ ...alert, watchId })),
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        message: "You already have another watch for that date, party and meal.",
        values: submitted,
      };
    }

    throw error;
  }

  revalidatePath("/dashboard");
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
