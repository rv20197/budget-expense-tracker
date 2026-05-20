-- Heartbeat table for cron job monitoring.
-- Each named job maintains a single row; the /api/health/cron endpoint
-- reads it to surface stale or erroring runs.

CREATE TABLE "cron_health" (
  "job_name"        varchar(100) PRIMARY KEY,
  "last_run_at"     timestamp with time zone,
  "last_success_at" timestamp with time zone,
  "last_error"      text,
  "last_error_at"   timestamp with time zone,
  "run_count"       integer NOT NULL DEFAULT 0,
  "success_count"   integer NOT NULL DEFAULT 0
);
