-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('OPENTABLE', 'RESY', 'TOCK', 'SEVENROOMS', 'DIRECT', 'OTHER');

-- CreateEnum
CREATE TYPE "Meal" AS ENUM ('BREAKFAST', 'BRUNCH', 'LUNCH', 'DINNER');

-- CreateEnum
CREATE TYPE "WatchStatus" AS ENUM ('ACTIVE', 'PAUSED', 'FULFILLED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DropAlertStatus" AS ENUM ('SCHEDULED', 'SENT', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'PUSH', 'SMS');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/London',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "days_in_advance" INTEGER NOT NULL,
    "release_time" TIME(0) NOT NULL,
    "timezone" TEXT NOT NULL,
    "booking_url" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "release_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "target_date" DATE NOT NULL,
    "party_size" INTEGER NOT NULL,
    "meal" "Meal" NOT NULL,
    "status" "WatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "watches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drop_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "watch_id" UUID NOT NULL,
    "release_rule_id" UUID NOT NULL,
    "platform" "Platform" NOT NULL,
    "drop_datetime" TIMESTAMPTZ(6) NOT NULL,
    "alert_at" TIMESTAMPTZ(6) NOT NULL,
    "booking_url" TEXT NOT NULL,
    "status" "DropAlertStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "drop_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "drop_alert_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "restaurants_city_idx" ON "restaurants"("city");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_name_city_key" ON "restaurants"("name", "city");

-- CreateIndex
CREATE INDEX "release_rules_restaurant_id_idx" ON "release_rules"("restaurant_id");

-- CreateIndex
CREATE INDEX "watches_user_id_status_idx" ON "watches"("user_id", "status");

-- CreateIndex
CREATE INDEX "watches_restaurant_id_target_date_idx" ON "watches"("restaurant_id", "target_date");

-- CreateIndex
CREATE UNIQUE INDEX "watches_user_id_restaurant_id_target_date_party_size_meal_key" ON "watches"("user_id", "restaurant_id", "target_date", "party_size", "meal");

-- CreateIndex
CREATE INDEX "drop_alerts_watch_id_idx" ON "drop_alerts"("watch_id");

-- CreateIndex
CREATE INDEX "drop_alerts_status_alert_at_idx" ON "drop_alerts"("status", "alert_at");

-- CreateIndex
CREATE INDEX "notifications_drop_alert_id_idx" ON "notifications"("drop_alert_id");

-- CreateIndex
CREATE INDEX "notifications_status_created_at_idx" ON "notifications"("status", "created_at");

-- AddForeignKey
ALTER TABLE "release_rules" ADD CONSTRAINT "release_rules_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watches" ADD CONSTRAINT "watches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watches" ADD CONSTRAINT "watches_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_alerts" ADD CONSTRAINT "drop_alerts_watch_id_fkey" FOREIGN KEY ("watch_id") REFERENCES "watches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_alerts" ADD CONSTRAINT "drop_alerts_release_rule_id_fkey" FOREIGN KEY ("release_rule_id") REFERENCES "release_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_drop_alert_id_fkey" FOREIGN KEY ("drop_alert_id") REFERENCES "drop_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
