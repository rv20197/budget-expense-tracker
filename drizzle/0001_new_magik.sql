CREATE TYPE "public"."debt_direction" AS ENUM('DEBT', 'LOAN');--> statement-breakpoint
CREATE TYPE "public"."debt_interest_type" AS ENUM('NONE', 'SIMPLE', 'COMPOUND');--> statement-breakpoint
CREATE TYPE "public"."debt_status" AS ENUM('ACTIVE', 'PAID', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "debt_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"paid_on" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"direction" "debt_direction" NOT NULL,
	"counterparty" text NOT NULL,
	"principal" numeric(12, 2) NOT NULL,
	"remaining_balance" numeric(12, 2) NOT NULL,
	"interest_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"interest_type" "debt_interest_type" DEFAULT 'NONE' NOT NULL,
	"due_date" date,
	"next_payment_date" date,
	"installment_amount" numeric(12, 2),
	"status" "debt_status" DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "debt_payments_debt_id_idx" ON "debt_payments" USING btree ("debt_id");--> statement-breakpoint
CREATE INDEX "debt_payments_user_id_idx" ON "debt_payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "debt_payments_paid_on_idx" ON "debt_payments" USING btree ("paid_on");--> statement-breakpoint
CREATE INDEX "debts_user_id_idx" ON "debts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "debts_status_idx" ON "debts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "debts_direction_idx" ON "debts" USING btree ("direction");