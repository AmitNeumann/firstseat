/**
 * Send one preview of the drop-alert email without marking any alert as SENT.
 *
 *   npm run alerts:send-test
 *
 * Uses the most recent scheduled watch in the database (the diner's real restaurant,
 * date, and booking link) so the inbox message looks like production. Resend's test
 * domain only delivers to the account owner's address.
 *
 * This does not wait for `alertAt`. Cron is what respects that clock; this only proves
 * the mailer can deliver.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { Resend } from "resend";

import { PrismaClient } from "../src/generated/prisma/client";
import { DropAlertStatus, WatchStatus } from "../src/generated/prisma/enums";
import { ALERT_FROM, renderAlertEmail } from "../src/lib/alerts/email";

loadEnv({ path: ".env.local" });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const apiKey = process.env.RESEND_API_KEY;

if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

if (!apiKey) {
  console.error("RESEND_API_KEY is not set. Add it to .env.local (server-only, never NEXT_PUBLIC_).");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const alert = await prisma.dropAlert.findFirst({
    where: {
      status: DropAlertStatus.SCHEDULED,
      watch: { status: WatchStatus.ACTIVE },
    },
    orderBy: { createdAt: "desc" },
    include: {
      watch: {
        select: {
          targetDate: true,
          meal: true,
          partySize: true,
          user: { select: { email: true, firstName: true, timezone: true } },
          restaurant: { select: { name: true } },
        },
      },
    },
  });

  if (!alert) {
    console.error("No scheduled watch found. Create a watch while signed in, then run this again.");
    process.exit(1);
  }

  const content = renderAlertEmail({
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

  const result = await new Resend(apiKey).emails.send({
    from: ALERT_FROM,
    to: alert.watch.user.email,
    subject: `[Preview] ${content.subject}`,
    text: content.text,
    html: content.html,
  });

  if (result.error) {
    console.error("Resend rejected the send:", result.error.message);
    process.exit(1);
  }

  console.log(`Preview sent to ${alert.watch.user.email}.`);
  console.log(`Restaurant: ${alert.watch.restaurant.name}.`);
  console.log("The drop_alert row was left SCHEDULED — this was only a delivery check.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
