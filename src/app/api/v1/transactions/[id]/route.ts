import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";

import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import {
  badRequest,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";
import { transactionSchema } from "@/features/transactions/schemas/finance.schemas";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const { id } = await params;
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

    const [updated] = await db
      .update(transactions)
      .set({
        amount: payload.amount,
        categoryId: payload.categoryId,
        description: payload.description,
        notes: payload.notes || null,
        transactionDate: new Date(payload.transactionDate),
        type: payload.type,
      })
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.householdId, householdId),
        ),
      )
      .returning({ id: transactions.id });

    if (!updated) return notFound("Transaction not found.");

    void userId;
    return ok(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest("Validation failed.", error.flatten().fieldErrors as Record<string, string[]>);
    }
    return serverError(error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const { id } = await params;
  const householdId = session.user.householdId;

  const [deleted] = await db
    .delete(transactions)
    .where(
      and(eq(transactions.id, id), eq(transactions.householdId, householdId)),
    )
    .returning({ id: transactions.id });

  if (!deleted) return notFound("Transaction not found.");

  return ok(deleted);
}
