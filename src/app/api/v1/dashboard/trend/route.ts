import { and, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { transactions } from "@/db/schema";
import { badRequest, ok, unauthorized } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";
import { endOfMonth, formatMonthYear, startOfMonth } from "@/lib/utils";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const householdId = session.user.householdId;
  const { searchParams } = new URL(request.url);
  const months = Math.min(Number(searchParams.get("months") ?? "6"), 12);

  const now = new Date();
  const startDate = startOfMonth(
    new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).getMonth() +
      1,
    new Date(
      now.getFullYear(),
      now.getMonth() - (months - 1),
      1,
    ).getFullYear(),
  );
  const endDate = endOfMonth(now.getMonth() + 1, now.getFullYear());

  const rows = await db
    .select({
      month: sql<string>`date_trunc('month', ${transactions.transactionDate})`,
      type: transactions.type,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, householdId),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate),
      ),
    )
    .groupBy(
      sql`date_trunc('month', ${transactions.transactionDate})`,
      transactions.type,
    )
    .orderBy(sql`date_trunc('month', ${transactions.transactionDate})`);

  const byMonth = new Map<string, { income: number; expense: number }>();
  for (const row of rows) {
    const key = row.month.slice(0, 7);
    const entry = byMonth.get(key) ?? { income: 0, expense: 0 };
    if (row.type === "income") entry.income = Number(row.total);
    else entry.expense = Number(row.total);
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

  return ok(results);
}
