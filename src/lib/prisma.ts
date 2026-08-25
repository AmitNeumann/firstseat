import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Next.js reloads modules on every edit in development. Without caching the client
// on globalThis, each reload would open another connection pool and exhaust the
// Postgres connection limit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill in your Supabase connection strings.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

/**
 * In development, replace the cached client whenever this module is evaluated.
 *
 * `prisma generate` updates `@/generated/prisma`, which reloads this file — but
 * `globalThis.prisma ?? create()` would keep the previous client for the whole
 * `next dev` process. That is how "Value 'resy' not found in enum 'Platform'"
 * survived after `platform` became a slug: the old client still thought it was
 * an enum. Disconnecting the previous instance picks up the new schema.
 */
function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV !== "production") {
    const previous = globalForPrisma.prisma;
    const next = createPrismaClient();
    globalForPrisma.prisma = next;

    if (previous) {
      void previous.$disconnect();
    }

    return next;
  }

  return (globalForPrisma.prisma ??= createPrismaClient());
}

export const prisma = getPrismaClient();
