import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories, statementUploads, transactions } from "@/db/schema";
import { badRequest, notFound, ok, unauthorized } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; txnId: string }> },
) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const { id, txnId } = await params;
  const householdId = session.user.householdId;

  let categoryId: string;
  try {
    const body = await request.json();
    categoryId = body?.categoryId;
  } catch {
    return badRequest("Invalid request body.");
  }

  if (!categoryId || typeof categoryId !== "string") {
    return badRequest("categoryId is required.");
  }

  // Verify upload belongs to household
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

  // Verify category belongs to this household
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.householdId, householdId),
      ),
    )
    .limit(1);

  if (!category) return badRequest("Category not found.");

  // Verify transaction belongs to this upload
  const [updated] = await db
    .update(transactions)
    .set({ categoryId })
    .where(
      and(
        eq(transactions.id, txnId),
        eq(transactions.uploadId, id),
        eq(transactions.householdId, householdId),
      ),
    )
    .returning({ id: transactions.id });

  if (!updated) return notFound("Transaction not found.");

  return ok({ id: txnId });
}
