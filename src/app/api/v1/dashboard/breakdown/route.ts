import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { badRequest, ok, unauthorized } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const householdId = session.user.householdId;
  const { searchParams } = new URL(request.url);

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const from = searchParams.get("from") ?? firstOfMonth;
  const to = searchParams.get("to") ?? now.toISOString().slice(0, 10);

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
        eq(transactions.householdId, householdId),
        eq(transactions.type, "expense"),
        gte(transactions.transactionDate, new Date(from)),
        lte(transactions.transactionDate, new Date(to)),
      ),
    )
    .groupBy(categories.id)
    .orderBy(desc(sql`sum(${transactions.amount})`));

  return ok(rows.map((r) => ({ ...r, total: Number(r.total) })));
}
