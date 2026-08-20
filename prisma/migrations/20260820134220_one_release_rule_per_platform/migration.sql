-- A restaurant may have at most one release rule per platform. This is what lets the
-- seed script update a rule in place instead of appending a second copy on every run.
--
-- The plain index on restaurant_id is dropped because the new unique index has
-- restaurant_id as its leading column and already serves the same lookups.

-- DropIndex
DROP INDEX "release_rules_restaurant_id_idx";

-- CreateIndex
CREATE UNIQUE INDEX "release_rules_restaurant_id_platform_key" ON "release_rules"("restaurant_id", "platform");
