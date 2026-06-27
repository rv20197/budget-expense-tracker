CREATE TABLE "statement_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"statement_period_start" date,
	"statement_period_end" date,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"total_found" integer DEFAULT 0 NOT NULL,
	"duplicates_skipped" integer DEFAULT 0 NOT NULL,
	"total_inserted" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "statement_uploads" ADD CONSTRAINT "statement_uploads_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "statement_uploads" ADD CONSTRAINT "statement_uploads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "statement_uploads_household_id_idx" ON "statement_uploads" USING btree ("household_id");
--> statement-breakpoint
CREATE INDEX "statement_uploads_created_by_idx" ON "statement_uploads" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX "statement_uploads_status_idx" ON "statement_uploads" USING btree ("status");
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "upload_id" uuid;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "raw_description" text;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "merchant_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "confidence_score" double precision;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_upload_id_statement_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."statement_uploads"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "transactions_upload_id_idx" ON "transactions" USING btree ("upload_id");
