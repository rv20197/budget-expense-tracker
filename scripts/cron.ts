import "dotenv/config";

import cron from "node-cron";
import { and, eq, lte } from "drizzle-orm";

import { db, pool } from "../src/db";
import { recurringTransactions, transactions } from "../src/db/schema";
import {
  addMonthsClamped,
  addYearsClamped,
  getDateString,
} from "../src/lib/utils";

function getNextDueDate(currentDate: Date, frequency: "monthly" | "yearly") {
  return frequency === "monthly"
    ? addMonthsClamped(currentDate, 1)
    : addYearsClamped(currentDate, 1);
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

    await db.transaction(async (tx) => {
      await tx.insert(transactions).values({
        userId: item.userId,
        categoryId: item.categoryId,
        type: item.type,
        description: item.description,
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
    console.log("[cron] Completed successfully.");
  } catch (error) {
    console.error("[cron] Failed:", error);
  }
});

console.log("[cron] Scheduler started. Running hourly at minute 0.");

process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});
