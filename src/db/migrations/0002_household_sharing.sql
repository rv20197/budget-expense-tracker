-- Custom SQL migration file, put your code below! --
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'record_scope') THEN
  CREATE TYPE "public"."record_scope" AS ENUM('household', 'personal');
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'household_role') THEN
  CREATE TYPE "public"."household_role" AS ENUM('admin', 'member');
 END IF;
END $$;
--> statement-breakpoint

CREATE TABLE "households" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "name" varchar(100) NOT NULL,
 "invite_code" varchar(12) NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "households_invite_code_unique" ON "households" USING btree ("invite_code");
--> statement-breakpoint

INSERT INTO "households" ("name", "invite_code", "created_at", "updated_at")
SELECT
 concat(left("users"."name", 84), ' Household'),
 substr(upper(replace("users"."id"::text, '-', '')), 1, 12),
 now(),
 now()
FROM "users"
ON CONFLICT ("invite_code") DO NOTHING;
--> statement-breakpoint

CREATE TABLE "household_members" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "household_id" uuid NOT NULL,
 "user_id" uuid NOT NULL,
 "role" "household_role" DEFAULT 'member' NOT NULL,
 "joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

INSERT INTO "household_members" ("household_id", "user_id", "role", "joined_at")
SELECT
 "households"."id",
 "users"."id",
 'admin',
 now()
FROM "users"
INNER JOIN "households"
 ON "households"."invite_code" = substr(upper(replace("users"."id"::text, '-', '')), 1, 12)
ON CONFLICT DO NOTHING;
--> statement-breakpoint

ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "household_members_user_id_unique" ON "household_members" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "household_members_household_user_unique" ON "household_members" USING btree ("household_id","user_id");
--> statement-breakpoint
CREATE INDEX "household_members_household_id_idx" ON "household_members" USING btree ("household_id");
--> statement-breakpoint

ALTER TABLE "categories" RENAME COLUMN "user_id" TO "created_by";
--> statement-breakpoint
ALTER TABLE "transactions" RENAME COLUMN "user_id" TO "created_by";
--> statement-breakpoint
ALTER TABLE "budgets" RENAME COLUMN "user_id" TO "created_by";
--> statement-breakpoint
ALTER TABLE "debts" RENAME COLUMN "user_id" TO "created_by";
--> statement-breakpoint
ALTER TABLE "debt_payments" RENAME COLUMN "user_id" TO "created_by";
--> statement-breakpoint

ALTER TABLE "categories" ADD COLUMN "household_id" uuid;
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "scope" "record_scope" DEFAULT 'household';
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "household_id" uuid;
--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "household_id" uuid;
--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "scope" "record_scope" DEFAULT 'household';
--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "household_id" uuid;
--> statement-breakpoint

UPDATE "categories" AS "categories"
SET "household_id" = "household_members"."household_id"
FROM "household_members"
WHERE "household_members"."user_id" = "categories"."created_by";
--> statement-breakpoint
UPDATE "transactions" AS "transactions"
SET "household_id" = "household_members"."household_id"
FROM "household_members"
WHERE "household_members"."user_id" = "transactions"."created_by";
--> statement-breakpoint
UPDATE "budgets" AS "budgets"
SET "household_id" = "household_members"."household_id"
FROM "household_members"
WHERE "household_members"."user_id" = "budgets"."created_by";
--> statement-breakpoint
UPDATE "debts" AS "debts"
SET "household_id" = "household_members"."household_id"
FROM "household_members"
WHERE "household_members"."user_id" = "debts"."created_by";
--> statement-breakpoint

ALTER TABLE "categories" ALTER COLUMN "household_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "scope" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "household_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "household_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "budgets" ALTER COLUMN "scope" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "debts" ALTER COLUMN "household_id" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "budgets" DROP CONSTRAINT IF EXISTS "budgets_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "debts" DROP CONSTRAINT IF EXISTS "debts_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "debt_payments" DROP CONSTRAINT IF EXISTS "debt_payments_user_id_users_id_fk";
--> statement-breakpoint

ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

DROP INDEX IF EXISTS "categories_user_name_type_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "categories_user_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "transactions_user_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "budgets_user_category_month_year_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "budgets_user_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "debts_user_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "debt_payments_user_id_idx";
--> statement-breakpoint

CREATE UNIQUE INDEX "categories_household_name_type_unique" ON "categories" USING btree ("household_id","name","type") WHERE "scope" = 'household';
--> statement-breakpoint
CREATE UNIQUE INDEX "categories_personal_creator_name_type_unique" ON "categories" USING btree ("household_id","created_by","name","type") WHERE "scope" = 'personal';
--> statement-breakpoint
CREATE INDEX "categories_household_id_idx" ON "categories" USING btree ("household_id");
--> statement-breakpoint
CREATE INDEX "categories_created_by_idx" ON "categories" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX "transactions_household_id_idx" ON "transactions" USING btree ("household_id");
--> statement-breakpoint
CREATE INDEX "transactions_created_by_idx" ON "transactions" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX "budgets_household_id_idx" ON "budgets" USING btree ("household_id");
--> statement-breakpoint
CREATE INDEX "budgets_created_by_idx" ON "budgets" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX "budgets_category_id_idx" ON "budgets" USING btree ("category_id");
--> statement-breakpoint
CREATE INDEX "debts_household_id_idx" ON "debts" USING btree ("household_id");
--> statement-breakpoint
CREATE INDEX "debts_created_by_idx" ON "debts" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX "debt_payments_created_by_idx" ON "debt_payments" USING btree ("created_by");
