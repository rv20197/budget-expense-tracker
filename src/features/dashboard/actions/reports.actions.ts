import "server-only";

import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
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

  const [incomeRow, expenseRow, recentTransactions, budgetRows] = await Promise.all([
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
    db
      .select({
        budgetAmount: budgets.amount,
        categoryColor: categories.color,
        categoryName: categories.name,
        scope: budgets.scope,
        spentAmount:
          sql<string>`coalesce(sum(case when ${transactions.transactionDate} between ${from} and ${to} then ${transactions.amount} else 0 end), 0)`,
      })
      .from(budgets)
      .innerJoin(categories, eq(categories.id, budgets.categoryId))
      .leftJoin(
        transactions,
        and(
          eq(transactions.categoryId, budgets.categoryId),
          eq(transactions.householdId, context.householdId),
          eq(transactions.type, "expense"),
        ),
      )
      .where(
        and(
          eq(budgets.householdId, context.householdId),
          eq(budgets.month, month),
          eq(budgets.year, year),
          or(
            eq(budgets.scope, "household"),
            and(eq(budgets.scope, "personal"), eq(budgets.createdBy, context.userId)),
          ),
        ),
      )
      .groupBy(budgets.id, categories.id),
  ]);

  return {
    budgetRows: budgetRows.map((item) => ({
      ...item,
      budgetAmount: toMoneyString(item.budgetAmount),
      spentAmount: toMoneyString(item.spentAmount),
    })),
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
    ]);

    results.push({
      expense: Number(expenseRow[0]?.total ?? "0"),
      income: Number(incomeRow[0]?.total ?? "0"),
      label: formatMonthYear(month, year),
    });
  }

  return results;
}
