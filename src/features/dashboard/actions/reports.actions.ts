import "server-only";

import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import {
  endOfMonth,
  formatMonthYear,
  startOfMonth,
  toMoneyString,
} from "@/lib/utils";

type DashboardContext = {
  householdId: string;
  userId: string;
};

export async function getMonthlySummary(
  context: DashboardContext,
  month: number,
  year: number,
) {
  "use cache";

  const from = startOfMonth(month, year);
  const to = endOfMonth(month, year);

  const [incomeRow, expenseRow, recentTransactions] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, context.householdId),
          eq(transactions.type, "income"),
          gte(transactions.transactionDate, from),
          lte(transactions.transactionDate, to),
        ),
      ),
    db
      .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, context.householdId),
          eq(transactions.type, "expense"),
          gte(transactions.transactionDate, from),
          lte(transactions.transactionDate, to),
        ),
      ),
    db
      .select({
        amount: transactions.amount,
        categoryName: categories.name,
        id: transactions.id,
        transactionDate: transactions.transactionDate,
        type: transactions.type,
        description: transactions.description,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(eq(transactions.householdId, context.householdId))
      .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
      .limit(5),
  ]);

  return {
    expense: toMoneyString(expenseRow[0]?.total ?? "0"),
    income: toMoneyString(incomeRow[0]?.total ?? "0"),
    monthLabel: formatMonthYear(month, year),
    recentTransactions: recentTransactions.map((item) => ({
      ...item,
      amount: toMoneyString(item.amount),
      transactionDate: item.transactionDate.toISOString().slice(0, 10),
    })),
  };
}

export async function getCategoryBreakdown(
  context: DashboardContext,
  from: string,
  to: string,
) {
  "use cache";

  const rows = await db
    .select({
      categoryColor: categories.color,
      categoryName: categories.name,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.householdId, context.householdId),
        eq(transactions.type, "expense"),
        gte(transactions.transactionDate, new Date(from)),
        lte(transactions.transactionDate, new Date(to)),
      ),
    )
    .groupBy(categories.id)
    .orderBy(desc(sql`sum(${transactions.amount})`));

  return rows.map((row) => ({
    ...row,
    total: Number(row.total),
  }));
}

export async function getTrend(context: DashboardContext, months = 6) {
  "use cache";

  const now = new Date();
  const from = startOfMonth(
    new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).getMonth() + 1,
    new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).getFullYear(),
  );
  const to = endOfMonth(now.getMonth() + 1, now.getFullYear());

  const rows = await db
    .select({
      month: sql<string>`date_trunc('month', ${transactions.transactionDate})`,
      type: transactions.type,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, context.householdId),
        gte(transactions.transactionDate, from),
        lte(transactions.transactionDate, to),
      ),
    )
    .groupBy(
      sql`date_trunc('month', ${transactions.transactionDate})`,
      transactions.type,
    )
    .orderBy(sql`date_trunc('month', ${transactions.transactionDate})`);

  const byMonth = new Map<string, { income: number; expense: number }>();
  for (const row of rows) {
    const key = row.month.slice(0, 7); // "YYYY-MM"
    const entry = byMonth.get(key) ?? { income: 0, expense: 0 };
    if (row.type === "income") {
      entry.income = Number(row.total);
    } else {
      entry.expense = Number(row.total);
    }
    byMonth.set(key, entry);
  }

  const results = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const entry = byMonth.get(key) ?? { income: 0, expense: 0 };
    results.push({ ...entry, label: formatMonthYear(month, year) });
  }

  return results;
}
