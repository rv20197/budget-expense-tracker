import "dotenv/config";

import cron from "node-cron";
import { and, eq, lte, sql } from "drizzle-orm";

import { db, pool } from "../src/db";
import {
  cronHealth,
  householdMembers,
  recurringTransactions,
  transactions,
} from "../src/db/schema";
import {
  addMonthsClamped,
  addYearsClamped,
  getDateString,
} from "../src/lib/utils";

const JOB_NAME = "recurring-transactions";

function getNextDueDate(currentDate: Date, frequency: "monthly" | "yearly") {
  return frequency === "monthly"
    ? addMonthsClamped(currentDate, 1)
    : addYearsClamped(currentDate, 1);
}

async function writeHeartbeat(success: boolean, error?: string) {
  try {
    await db
      .insert(cronHealth)
      .values({
        jobName: JOB_NAME,
        lastRunAt: new Date(),
        lastSuccessAt: success ? new Date() : undefined,
        lastError: success ? null : (error ?? "Unknown error"),
        lastErrorAt: success ? undefined : new Date(),
        runCount: 1,
        successCount: success ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: cronHealth.jobName,
        set: {
          lastRunAt: new Date(),
          lastSuccessAt: success ? new Date() : undefined,
          lastError: success ? null : (error ?? "Unknown error"),
          lastErrorAt: success ? undefined : new Date(),
          runCount: sql`${cronHealth.runCount} + 1`,
          successCount: success
            ? sql`${cronHealth.successCount} + 1`
            : undefined,
        },
      });
  } catch (heartbeatError) {
    // Heartbeat failure must never crash the cron process itself.
    console.error("[cron] Failed to write heartbeat:", heartbeatError);
  }
}

async function processRecurringTransactions() {
  const today = new Date();
  const dueItems = await db
    .select()
    .from(recurringTransactions)
    .where(
      and(
        eq(recurringTransactions.isActive, true),
        lte(recurringTransactions.nextDueDate, today),
      ),
    );

  for (const item of dueItems) {
    const nextDueDate = getNextDueDate(item.nextDueDate, item.frequency);
    const [membership] = await db
      .select({ householdId: householdMembers.householdId })
      .from(householdMembers)
      .where(eq(householdMembers.userId, item.userId))
      .limit(1);

    if (!membership) {
      continue;
    }

    await db.transaction(async (tx) => {
      await tx.insert(transactions).values({
        categoryId: item.categoryId,
        createdBy: item.userId,
        type: item.type,
        description: item.description,
        householdId: membership.householdId,
        amount: item.amount,
        transactionDate: item.nextDueDate,
        notes: item.notes,
      });

      await tx
        .update(recurringTransactions)
        .set({
          nextDueDate,
          lastProcessedAt: new Date(),
        })
        .where(eq(recurringTransactions.id, item.id));
    });

    console.log(
      `[cron] Processed ${item.description}; next due ${getDateString(nextDueDate)}`,
    );
  }
}

cron.schedule("0 * * * *", async () => {
  console.log("[cron] Running recurring transaction processor...");

  try {
    await processRecurringTransactions();
    await writeHeartbeat(true);
    console.log("[cron] Completed successfully.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron] Failed:", error);
    await writeHeartbeat(false, message);
  }
});

console.log("[cron] Scheduler started. Running hourly at minute 0.");

process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});
