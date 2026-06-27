import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  lte,
} from "drizzle-orm";

import { db } from "@/db";
import { categories, statementUploads, transactions } from "@/db/schema";
import { badRequest, notFound, ok, unauthorized } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";
import { toMoneyString } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const { id } = await params;
  const householdId = session.user.householdId;
  const url = new URL(request.url);

  // Verify upload ownership
  const [upload] = await db
    .select({ id: statementUploads.id })
    .from(statementUploads)
    .where(
      and(
        eq(statementUploads.id, id),
        eq(statementUploads.householdId, householdId),
      ),
    )
    .limit(1);

  if (!upload) return notFound("Upload not found.");

  // Query params
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")));
  const offset = (page - 1) * limit;
  const categoryId = url.searchParams.get("categoryId") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;
  const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
  const dateTo = url.searchParams.get("dateTo") ?? undefined;
  const lowConfidenceOnly = url.searchParams.get("lowConfidence") === "true";

  const where = and(
    eq(transactions.uploadId, id),
    categoryId ? eq(transactions.categoryId, categoryId) : undefined,
    type === "income" || type === "expense"
      ? eq(transactions.type, type)
      : undefined,
    dateFrom
      ? gte(transactions.transactionDate, new Date(dateFrom))
      : undefined,
    dateTo
      ? lte(transactions.transactionDate, new Date(dateTo))
      : undefined,
    lowConfidenceOnly ? isNotNull(transactions.confidenceScore) : undefined,
  );

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: transactions.id,
        description: transactions.description,
        rawDescription: transactions.rawDescription,
        merchantName: transactions.merchantName,
        amount: transactions.amount,
        type: transactions.type,
        transactionDate: transactions.transactionDate,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        confidenceScore: transactions.confidenceScore,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(where)
      .orderBy(desc(transactions.transactionDate), asc(transactions.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(transactions)
      .where(where),
  ]);

  // Filter low confidence after fetch if needed
  const filtered = lowConfidenceOnly
    ? items.filter((t) => (t.confidenceScore ?? 1) < 0.6)
    : items;

  return ok({
    items: filtered.map((t) => ({
      ...t,
      amount: toMoneyString(t.amount),
      transactionDate: t.transactionDate instanceof Date
        ? t.transactionDate.toISOString().slice(0, 10)
        : String(t.transactionDate),
    })),
    page,
    limit,
    total: lowConfidenceOnly ? filtered.length : Number(total),
    totalPages: Math.ceil(Number(total) / limit),
  });
}
