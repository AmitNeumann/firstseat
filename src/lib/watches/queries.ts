import "server-only";

import { WatchStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

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
      releaseRules: {
        select: {
          platform: true,
          daysInAdvance: true,
          timezone: true,
        },
      },
    },
  });
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
        orderBy: { dropDatetime: "asc" },
        select: {
          id: true,
          platform: true,
          dropDatetime: true,
          alertAt: true,
          bookingUrl: true,
          status: true,
        },
      },
    },
  });
}

export type UserWatch = Awaited<ReturnType<typeof listWatchesForUser>>[number];
