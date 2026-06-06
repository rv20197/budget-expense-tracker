import { and, count, desc, eq, gte, ilike, lte } from "drizzle-orm";
import { ZodError } from "zod";

import { db } from "@/db";
import { categories, transactions, users } from "@/db/schema";
import {
  badRequest,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";
import { toMoneyString } from "@/lib/utils";
import { transactionSchema } from "@/features/transactions/schemas/finance.schemas";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const { householdId } = { householdId: session.user.householdId };
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search") ?? undefined;
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const type = (searchParams.get("type") ?? undefined) as
    | "income"
    | "expense"
    | undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") ?? "20"), 1), 50);

  const conditions = [eq(transactions.householdId, householdId)];
  if (search) conditions.push(ilike(transactions.description, `%${search}%`));
  if (categoryId) conditions.push(eq(transactions.categoryId, categoryId));
  if (type) conditions.push(eq(transactions.type, type));
  if (from) conditions.push(gte(transactions.transactionDate, new Date(from)));
  if (to) conditions.push(lte(transactions.transactionDate, new Date(to)));

  const where = and(...conditions);

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        type: transactions.type,
        transactionDate: transactions.transactionDate,
        notes: transactions.notes,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        createdBy: transactions.createdBy,
        addedByName: users.name,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .innerJoin(users, eq(users.id, transactions.createdBy))
      .where(where)
      .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(transactions).where(where),
  ]);

  return ok({
    items: items.map((item) => ({
      ...item,
      amount: toMoneyString(item.amount),
      transactionDate: item.transactionDate.toISOString().slice(0, 10),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const { userId, householdId } = {
    userId: session.user.id,
    householdId: session.user.householdId,
  };

  try {
    const body = await request.json();
    const payload = transactionSchema.parse(body);

    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.id, payload.categoryId),
          eq(categories.householdId, householdId),
        ),
      )
      .limit(1);

    if (!category) return badRequest("Category not found.");

    const [created] = await db
      .insert(transactions)
      .values({
        amount: payload.amount,
        categoryId: payload.categoryId,
        createdBy: userId,
        description: payload.description,
        householdId,
        notes: payload.notes || null,
        transactionDate: new Date(payload.transactionDate),
        type: payload.type,
      })
      .returning({ id: transactions.id });

    return ok(created, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest("Validation failed.", error.flatten().fieldErrors as Record<string, string[]>);
    }
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
