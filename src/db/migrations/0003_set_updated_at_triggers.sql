-- Adds a shared trigger function + BEFORE UPDATE triggers for every table
-- that carries an `updated_at` column. This ensures the column is maintained
-- correctly even for raw SQL updates that bypass the Drizzle ORM layer.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

CREATE OR REPLACE TRIGGER trg_refresh_tokens_updated_at
  BEFORE UPDATE ON "refresh_tokens"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

CREATE OR REPLACE TRIGGER trg_households_updated_at
  BEFORE UPDATE ON "households"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

CREATE OR REPLACE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON "categories"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

CREATE OR REPLACE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON "transactions"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

CREATE OR REPLACE TRIGGER trg_budgets_updated_at
  BEFORE UPDATE ON "budgets"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

CREATE OR REPLACE TRIGGER trg_recurring_transactions_updated_at
  BEFORE UPDATE ON "recurring_transactions"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

CREATE OR REPLACE TRIGGER trg_debts_updated_at
  BEFORE UPDATE ON "debts"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
