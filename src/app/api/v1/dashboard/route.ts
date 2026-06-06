import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { badRequest, ok, unauthorized } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";
import {
  endOfMonth,
  formatMonthYear,
  startOfMonth,
  toMoneyString,
} from "@/lib/utils";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const { userId, householdId } = {
    userId: session.user.id,
    householdId: session.user.householdId,
  };

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1);
  const year = Number(searchParams.get("year") ?? now.getFullYear());

  const from = startOfMonth(month, year);
  const to = endOfMonth(month, year);

  const [incomeRow, expenseRow, recentTransactions, budgetRows] =
    await Promise.all([
      db
        .select({
          total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.householdId, householdId),
            eq(transactions.type, "income"),
            gte(transactions.transactionDate, from),
            lte(transactions.transactionDate, to),
          ),
        ),
      db
        .select({
          total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.householdId, householdId),
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
        .where(eq(transactions.householdId, householdId))
        .orderBy(
          desc(transactions.transactionDate),
          desc(transactions.createdAt),
        )
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
            eq(transactions.householdId, householdId),
            eq(transactions.type, "expense"),
          ),
        )
        .where(
          and(
            eq(budgets.householdId, householdId),
            eq(budgets.month, month),
            eq(budgets.year, year),
            or(
              eq(budgets.scope, "household"),
              and(
                eq(budgets.scope, "personal"),
                eq(budgets.createdBy, userId),
              ),
            ),
          ),
        )
        .groupBy(budgets.id, categories.id),
    ]);

  return ok({
    month,
    year,
    monthLabel: formatMonthYear(month, year),
    income: toMoneyString(incomeRow[0]?.total ?? "0"),
    expense: toMoneyString(expenseRow[0]?.total ?? "0"),
    recentTransactions: recentTransactions.map((t) => ({
      ...t,
      amount: toMoneyString(t.amount),
      transactionDate: t.transactionDate.toISOString().slice(0, 10),
    })),
    budgetRows: budgetRows.map((b) => ({
      ...b,
      budgetAmount: toMoneyString(b.budgetAmount),
      spentAmount: toMoneyString(b.spentAmount),
    })),
  });
}
