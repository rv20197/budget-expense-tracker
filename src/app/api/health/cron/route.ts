import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { cronHealth } from "@/db/schema";

// Maximum seconds allowed since the last successful run before the
// endpoint reports unhealthy. Set to 2× the cron schedule (hourly → 7200s).
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

const JOB_NAME = "recurring-transactions";

export async function GET() {
  const [row] = await db
    .select()
    .from(cronHealth)
    .where(eq(cronHealth.jobName, JOB_NAME))
    .limit(1);

  if (!row) {
    return NextResponse.json(
      {
        healthy: false,
        jobName: JOB_NAME,
        reason: "No heartbeat recorded yet. The cron process may not have run.",
      },
      { status: 503 },
    );
  }

  const now = Date.now();
  const lastSuccess = row.lastSuccessAt?.getTime() ?? 0;
  const isStale = now - lastSuccess > STALE_THRESHOLD_MS;

  if (isStale || row.lastError) {
    return NextResponse.json(
      {
        healthy: false,
        jobName: JOB_NAME,
        lastRunAt: row.lastRunAt,
        lastSuccessAt: row.lastSuccessAt,
        lastError: row.lastError,
        lastErrorAt: row.lastErrorAt,
        runCount: row.runCount,
        successCount: row.successCount,
        reason: isStale
          ? `Last successful run was more than ${STALE_THRESHOLD_MS / 1000 / 60} minutes ago.`
          : "Last run ended with an error.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    healthy: true,
    jobName: JOB_NAME,
    lastRunAt: row.lastRunAt,
    lastSuccessAt: row.lastSuccessAt,
    runCount: row.runCount,
    successCount: row.successCount,
  });
}
