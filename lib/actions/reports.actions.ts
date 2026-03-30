import "server-only";

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { budgets, categories, transactions } from "@/lib/db/schema";
import {
  endOfMonth,
  formatMonthYear,
  startOfMonth,
  toMoneyString,
} from "@/lib/utils";

export async function getMonthlySummary(
  userId: string,
  month: number,
  year: number,
) {
  "use cache";

  const from = startOfMonth(month, year);
  const to = endOfMonth(month, year);

  const [incomeRow, expenseRow, recentTransactions, budgetRows] = await Promise.all([
    db
      .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
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
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          gte(transactions.transactionDate, from),
          lte(transactions.transactionDate, to),
        ),
      ),
    db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        type: transactions.type,
        transactionDate: transactions.transactionDate,
        categoryName: categories.name,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
      .limit(5),
    db
      .select({
        categoryName: categories.name,
        categoryColor: categories.color,
        budgetAmount: budgets.amount,
        spentAmount: sql<string>`coalesce(sum(case when ${transactions.transactionDate} between ${from} and ${to} then ${transactions.amount} else 0 end), 0)`,
      })
      .from(budgets)
      .innerJoin(categories, eq(categories.id, budgets.categoryId))
      .leftJoin(
        transactions,
        and(
          eq(transactions.categoryId, budgets.categoryId),
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
        ),
      )
      .where(
        and(eq(budgets.userId, userId), eq(budgets.month, month), eq(budgets.year, year)),
      )
      .groupBy(budgets.id, categories.id),
  ]);

  return {
    monthLabel: formatMonthYear(month, year),
    income: toMoneyString(incomeRow[0]?.total ?? "0"),
    expense: toMoneyString(expenseRow[0]?.total ?? "0"),
    recentTransactions: recentTransactions.map((item) => ({
      ...item,
      amount: toMoneyString(item.amount),
      transactionDate: item.transactionDate.toISOString().slice(0, 10),
    })),
    budgetRows: budgetRows.map((item) => ({
      ...item,
      budgetAmount: toMoneyString(item.budgetAmount),
      spentAmount: toMoneyString(item.spentAmount),
    })),
  };
}

export async function getCategoryBreakdown(
  userId: string,
  from: string,
  to: string,
) {
  "use cache";

  const rows = await db
    .select({
      categoryName: categories.name,
      categoryColor: categories.color,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.userId, userId),
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

export async function getTrend(userId: string, months = 6) {
  "use cache";

  const results = [];
  const now = new Date();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const from = startOfMonth(month, year);
    const to = endOfMonth(month, year);

    const [incomeRow, expenseRow] = await Promise.all([
      db
        .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
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
            eq(transactions.userId, userId),
            eq(transactions.type, "expense"),
            gte(transactions.transactionDate, from),
            lte(transactions.transactionDate, to),
          ),
        ),
    ]);

    results.push({
      label: formatMonthYear(month, year),
      income: Number(incomeRow[0]?.total ?? "0"),
      expense: Number(expenseRow[0]?.total ?? "0"),
    });
  }

  return results;
}
