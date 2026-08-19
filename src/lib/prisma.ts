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

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
