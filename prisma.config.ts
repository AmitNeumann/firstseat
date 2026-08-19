import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 does not read .env files on its own. Load .env.local so the Prisma CLI
// and Next.js share a single git-ignored secrets file.
loadEnv({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations run DDL, which is unreliable over Supabase's transaction pooler.
    // DIRECT_URL is the non-pooled connection; DATABASE_URL is the pooled one the app uses.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
