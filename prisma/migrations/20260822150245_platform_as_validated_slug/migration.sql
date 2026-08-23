-- Convert `platform` from the `Platform` enum to a validated lowercase slug.
--
-- The set of booking platforms is open-ended editorial data that no code branches on, so
-- an enum charged a schema migration for what is really a data edit. Text plus a CHECK
-- constraint keeps the database enforcing the shape without fixing the list.
--
-- ⚠️ Written by hand on purpose. `prisma migrate diff` produces DROP COLUMN followed by
-- ADD COLUMN for this change, which would discard every platform value already stored.
-- Converting in place with USING preserves them, and lower() puts them in the new
-- canonical form: 'RESY' becomes 'resy'.
--
-- The unique index on (restaurant_id, platform) is rebuilt by Postgres as part of the
-- type change, so it does not need recreating here.

ALTER TABLE "release_rules"
  ALTER COLUMN "platform" TYPE VARCHAR(40) USING lower("platform"::text);

ALTER TABLE "drop_alerts"
  ALTER COLUMN "platform" TYPE VARCHAR(40) USING lower("platform"::text);

DROP TYPE "Platform";

-- The guarantee the enum used to give, expressed as a rule instead of a fixed list.
-- Prisma cannot represent CHECK constraints, so this lives only in the migration SQL.
-- Keep it in step with PLATFORM_SLUG_PATTERN in src/lib/watches/platforms.ts.

ALTER TABLE "release_rules"
  ADD CONSTRAINT "release_rules_platform_slug_check"
  CHECK ("platform" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE "drop_alerts"
  ADD CONSTRAINT "drop_alerts_platform_slug_check"
  CHECK ("platform" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
