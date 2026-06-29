import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
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

  const { householdId } = {
    householdId: session.user.householdId,
  };

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1);
  const year = Number(searchParams.get("year") ?? now.getFullYear());

  const from = startOfMonth(month, year);
  const to = endOfMonth(month, year);

  const [incomeRow, expenseRow, recentTransactions] =
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
  });
}
