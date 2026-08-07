ALTER TABLE "debt_payments" ADD COLUMN IF NOT EXISTS "transaction_id" uuid REFERENCES "transactions"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "debt_payments_transaction_id_idx" ON "debt_payments" ("transaction_id");
