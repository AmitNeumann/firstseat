/**
 * Seeds the restaurants and their release rules from `prisma/seed/nyc-restaurants.ts`.
 *
 *   npm run db:seed
 *
 * Three properties it is built around:
 *
 *  • **Nothing is invented.** An entry with any field still set to `TODO` is skipped and
 *    listed, never written with a stand-in value.
 *  • **Nothing invalid is written.** Every candidate is parsed by Zod first. If a single
 *    entry fails, the run aborts before touching the database, so the seed file and the
 *    database never disagree about what is in it.
 *  • **Re-running is safe.** Restaurants are matched on (name, city) and rules on
 *    (restaurant, platform), both unique in the schema, so a second run updates rather
 *    than duplicates. That is what makes it practical to research a few restaurants at a
 *    time.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

import { PrismaClient } from "../src/generated/prisma/client";
import { nycRestaurants } from "./seed/nyc-restaurants";
import { missingFields, type RestaurantSeed } from "./seed/types";
import { RestaurantSeedSchema, formatIssues, type ValidRestaurantSeed } from "./seed/validate";

loadEnv({ path: ".env.local" });

/**
 * Prefer the non-pooled connection. A seed is a single short-lived script, so it gains
 * nothing from the pooler, and running it outside pgbouncer keeps the transaction below
 * behaving like an ordinary session transaction.
 */
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "DIRECT_URL is not set. Copy .env.example to .env.local and fill in your Supabase connection strings.",
  );
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/**
 * `release_time` is a Postgres `time` column, which Prisma carries in a JS `Date` whose
 * date part is ignored. 1970-01-01 UTC is the conventional filler for that unused part —
 * it is not a timezone conversion, and the rule's own `timezone` is what gives the time
 * meaning.
 */
function timeOnly(releaseTime: string): Date {
  return new Date(`1970-01-01T${releaseTime}:00.000Z`);
}

function label(entry: RestaurantSeed): string {
  return `${entry.name} (${entry.city})`;
}

/** The transaction-scoped client, i.e. `prisma` minus the methods a transaction cannot use. */
type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function upsert(tx: TransactionClient, entry: ValidRestaurantSeed): Promise<void> {
  const { name, city, imageUrl, releaseRule, source } = entry;

  const restaurant = await tx.restaurant.upsert({
    where: { name_city: { name, city } },
    create: { name, city, imageUrl: imageUrl ?? null },
    update: { imageUrl: imageUrl ?? null },
    select: { id: true },
  });

  const rule = {
    daysInAdvance: releaseRule.daysInAdvance,
    releaseTime: timeOnly(releaseRule.releaseTime),
    timezone: releaseRule.timezone,
    bookingUrl: releaseRule.bookingUrl,
    // Only ever true here, and only because `source` records where a human read the rule.
    // Nothing else in the codebase sets it.
    verified: true,
  };

  await tx.releaseRule.upsert({
    where: {
      restaurantId_platform: {
        restaurantId: restaurant.id,
        platform: releaseRule.platform,
      },
    },
    create: { restaurantId: restaurant.id, platform: releaseRule.platform, ...rule },
    update: rule,
  });

  console.log(`  ✓ ${label(entry)} — ${releaseRule.platform}, ${releaseRule.daysInAdvance}d at ${releaseRule.releaseTime} ${releaseRule.timezone}`);
  console.log(`      source: ${source}`);
}

async function main(): Promise<void> {
  const ready: RestaurantSeed[] = [];
  const incomplete: { entry: RestaurantSeed; missing: string[] }[] = [];

  for (const entry of nycRestaurants) {
    const missing = missingFields(entry);

    if (missing.length > 0) {
      incomplete.push({ entry, missing });
    } else {
      ready.push(entry);
    }
  }

  // Two entries with the same (name, city) would silently overwrite each other, because
  // that pair is the unique key. Caught here so the message names the real problem.
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const entry of nycRestaurants) {
    const key = label(entry);
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }

  if (duplicates.size > 0) {
    console.error("\n✗ The seed file lists the same restaurant twice:");
    for (const key of duplicates) console.error(`    ${key}`);
    process.exitCode = 1;
    return;
  }

  const valid: ValidRestaurantSeed[] = [];
  const invalid: { entry: RestaurantSeed; problems: string[] }[] = [];

  for (const entry of ready) {
    const parsed = RestaurantSeedSchema.safeParse(entry);

    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      invalid.push({ entry, problems: formatIssues(parsed.error) });
    }
  }

  if (invalid.length > 0) {
    console.error("\n✗ Some filled-in entries are not valid. Nothing was written.\n");

    for (const { entry, problems } of invalid) {
      console.error(`  ${label(entry)}`);
      for (const problem of problems) console.error(`      ${problem}`);
    }

    process.exitCode = 1;
    return;
  }

  if (valid.length > 0) {
    console.log(`\nSeeding ${valid.length} restaurant${valid.length === 1 ? "" : "s"}:\n`);

    // One transaction: either the whole seed file lands or none of it does, so a failure
    // halfway through cannot leave a restaurant row with no release rule attached.
    await prisma.$transaction(async (tx) => {
      for (const entry of valid) await upsert(tx, entry);
    });
  }

  if (incomplete.length > 0) {
    console.log(
      `\nSkipped ${incomplete.length} restaurant${incomplete.length === 1 ? "" : "s"} still waiting on real data:\n`,
    );

    for (const { entry, missing } of incomplete) {
      console.log(`  · ${label(entry)} — needs ${missing.join(", ")}`);
    }

    console.log("\nFill those in in prisma/seed/nyc-restaurants.ts and run this again.");
  }

  if (valid.length === 0 && incomplete.length === 0) {
    console.log("\nThe seed file is empty.");
  }
}

main()
  .catch((error: unknown) => {
    console.error("\n✗ Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
