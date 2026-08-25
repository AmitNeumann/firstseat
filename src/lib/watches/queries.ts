import "server-only";

import { DropAlertStatus, WatchStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { timeOfDayFromDate } from "@/lib/time";
import { LANDING_DEMO_CITY, LANDING_DEMO_NAME } from "@/lib/watches/landing-demo";
import type { RestaurantOption } from "@/lib/watches/options";

/**
 * Reads for the watch feature.
 *
 * 🔴 Prisma connects as the Postgres `postgres` role, which bypasses Row Level Security.
 * Supabase's RLS policies will not stop a query here from returning another user's rows.
 * Every read of user-owned data therefore takes `userId` as an argument and puts it in the
 * `where` clause — that scoping *is* the authorization, and forgetting it is the most
 * likely way to leak data in this codebase.
 *
 * Restaurants and release rules are the exception: they are the same public reference data
 * for everybody, so they are not scoped to anyone.
 */

/**
 * Restaurants we can actually watch, i.e. ones whose release rule someone has researched.
 *
 * A restaurant with no rule is filtered out rather than shown and rejected on submit: we
 * would have no way to work out when its tables drop, so offering it would be a promise we
 * cannot keep.
 */
export async function listBookableRestaurants() {
  return prisma.restaurant.findMany({
    where: { releaseRules: { some: {} } },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      city: true,
      imageUrl: true,
      releaseRules: {
        orderBy: { platform: "asc" },
        select: {
          platform: true,
          daysInAdvance: true,
          releaseTime: true,
          timezone: true,
        },
      },
    },
  });
}

/**
 * The restaurant list shaped for the form, with `time` columns turned into plain "HH:MM"
 * strings. Doing the conversion here keeps `Date` objects whose date part is meaningless
 * from being sent to the browser, where they invite exactly the wrong reading.
 */
export async function listRestaurantOptions(): Promise<RestaurantOption[]> {
  const restaurants = await listBookableRestaurants();

  return restaurants.map(toRestaurantOption);
}

/**
 * The one restaurant the signed-out landing is allowed to name.
 *
 * Not `listRestaurantOptions`: that would send the whole catalog to the browser, which
 * is exactly what gating the list is meant to prevent.
 */
export async function getLandingDemoRestaurant(): Promise<RestaurantOption | null> {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      name: LANDING_DEMO_NAME,
      city: LANDING_DEMO_CITY,
      releaseRules: { some: {} },
    },
    select: {
      id: true,
      name: true,
      city: true,
      imageUrl: true,
      releaseRules: {
        orderBy: { platform: "asc" },
        select: {
          platform: true,
          daysInAdvance: true,
          releaseTime: true,
          timezone: true,
        },
      },
    },
  });

  return restaurant ? toRestaurantOption(restaurant) : null;
}

function toRestaurantOption(restaurant: {
  id: string;
  name: string;
  city: string;
  imageUrl: string | null;
  releaseRules: {
    platform: string;
    daysInAdvance: number;
    releaseTime: Date;
    timezone: string;
  }[];
}): RestaurantOption {
  return {
    id: restaurant.id,
    name: restaurant.name,
    city: restaurant.city,
    imageUrl: restaurant.imageUrl,
    rules: restaurant.releaseRules.map((rule) => ({
      platform: rule.platform,
      daysInAdvance: rule.daysInAdvance,
      releaseTime: timeOfDayFromDate(rule.releaseTime),
      timezone: rule.timezone,
    })),
  };
}

export type BookableRestaurant = Awaited<
  ReturnType<typeof listBookableRestaurants>
>[number];

/** One user's watches, newest target date first, with the alerts computed for each. */
export async function listWatchesForUser(userId: string) {
  return prisma.watch.findMany({
    where: {
      userId,
      status: { not: WatchStatus.CANCELLED },
    },
    orderBy: [{ targetDate: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      targetDate: true,
      partySize: true,
      meal: true,
      status: true,
      restaurant: {
        select: { name: true, city: true },
      },
      dropAlerts: {
        // Editing a watch's date cancels its alerts and schedules new ones. The cancelled
        // rows are kept as a record of what was scheduled, but they are not what the user
        // is waiting for, so they stay out of the card.
        where: { status: { not: DropAlertStatus.CANCELLED } },
        orderBy: { dropDatetime: "asc" },
        select: {
          id: true,
          platform: true,
          dropDatetime: true,
          alertAt: true,
          bookingUrl: true,
          status: true,
          // The zone the release time is quoted in, so a drop can be shown on the
          // restaurant's clock as well as the user's.
          releaseRule: { select: { timezone: true } },
        },
      },
    },
  });
}

export type UserWatch = Awaited<ReturnType<typeof listWatchesForUser>>[number];

/**
 * One watch belonging to one user, shaped for the edit form.
 *
 * `findFirst` with `userId` in the where clause rather than `findUnique` by id: another
 * account's watch comes back as `null`, exactly like an id that was never real. The page
 * turns both into a 404, so this cannot be used to find out which ids exist.
 */
export async function getWatchForUser(userId: string, watchId: string) {
  const watch = await prisma.watch.findFirst({
    where: { id: watchId, userId, status: WatchStatus.ACTIVE },
    select: {
      id: true,
      targetDate: true,
      partySize: true,
      meal: true,
      restaurant: {
        select: {
          id: true,
          name: true,
          city: true,
          releaseRules: {
            orderBy: { platform: "asc" },
            select: {
              platform: true,
              daysInAdvance: true,
              releaseTime: true,
              timezone: true,
            },
          },
        },
      },
    },
  });

  if (!watch) {
    return null;
  }

  return {
    id: watch.id,
    // A `date` column has no zone; its ISO date part is the value, and it is what the
    // date input expects.
    targetDate: watch.targetDate.toISOString().slice(0, 10),
    partySize: watch.partySize,
    meal: watch.meal,
    restaurant: {
      id: watch.restaurant.id,
      name: watch.restaurant.name,
      city: watch.restaurant.city,
      rules: watch.restaurant.releaseRules.map((rule) => ({
        platform: rule.platform,
        daysInAdvance: rule.daysInAdvance,
        releaseTime: timeOfDayFromDate(rule.releaseTime),
        timezone: rule.timezone,
      })),
    } satisfies RestaurantOption,
  };
}

export type EditableWatch = NonNullable<Awaited<ReturnType<typeof getWatchForUser>>>;
