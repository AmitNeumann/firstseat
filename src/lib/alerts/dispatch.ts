import "server-only";

import {
  DropAlertStatus,
  NotificationChannel,
  NotificationStatus,
  WatchStatus,
} from "@/generated/prisma/enums";
import { sendAlertEmail, AlertConfigError } from "@/lib/alerts/send";
import { prisma } from "@/lib/prisma";

const DEFAULT_BATCH = 20;

export type DispatchSummary = {
  due: number;
  sent: number;
  failed: number;
  skipped: number;
};

/**
 * Find due, unsent drop alerts and deliver them.
 *
 * Timing is not recalculated: we trust `alertAt` written when the watch was created.
 * Status is flipped to SENT *before* the HTTP call so two overlapping cron runs cannot
 * send the same row twice. A failed send is rolled back to SCHEDULED so the next run
 * retries.
 */
export async function dispatchDueAlerts(
  now = new Date(),
  { limit = DEFAULT_BATCH }: { limit?: number } = {},
): Promise<DispatchSummary> {
  if (!process.env.RESEND_API_KEY) {
    throw new AlertConfigError();
  }

  const due = await prisma.dropAlert.findMany({
    where: {
      status: DropAlertStatus.SCHEDULED,
      alertAt: { lte: now },
      watch: { status: WatchStatus.ACTIVE },
    },
    orderBy: { alertAt: "asc" },
    take: limit,
    include: {
      watch: {
        select: {
          targetDate: true,
          meal: true,
          partySize: true,
          user: {
            select: { email: true, firstName: true, timezone: true },
          },
          restaurant: { select: { name: true } },
        },
      },
    },
  });

  const summary: DispatchSummary = {
    due: due.length,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  for (const alert of due) {
    const claimed = await prisma.dropAlert.updateMany({
      where: { id: alert.id, status: DropAlertStatus.SCHEDULED },
      data: { status: DropAlertStatus.SENT },
    });

    if (claimed.count !== 1) {
      summary.skipped += 1;
      continue;
    }

    try {
      await sendAlertEmail({
        to: alert.watch.user.email,
        firstName: alert.watch.user.firstName,
        restaurantName: alert.watch.restaurant.name,
        targetDate: alert.watch.targetDate.toISOString().slice(0, 10),
        meal: alert.watch.meal,
        partySize: alert.watch.partySize,
        platform: alert.platform,
        bookingUrl: alert.bookingUrl,
        dropDatetime: alert.dropDatetime,
        userTimezone: alert.watch.user.timezone,
      });

      await prisma.notification.create({
        data: {
          dropAlertId: alert.id,
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      });

      summary.sent += 1;
    } catch (error) {
      await prisma.dropAlert.update({
        where: { id: alert.id },
        data: { status: DropAlertStatus.SCHEDULED },
      });

      await prisma.notification.create({
        data: {
          dropAlertId: alert.id,
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.FAILED,
        },
      });

      summary.failed += 1;
      console.error("[alerts] send failed:", alert.id, error);
    }
  }

  return summary;
}
