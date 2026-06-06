import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { budgets } from "@/db/schema";
import {
  badRequest,
  forbidden,
  notFound,
  ok,
  unauthorized,
} from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";

export async function DELETE(
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

  const [budget] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.householdId, householdId)))
    .limit(1);

  if (!budget) return notFound("Budget not found.");
  if (budget.scope === "personal" && budget.createdBy !== userId) {
    return forbidden("Cannot delete another member's personal budget.");
  }

  const [deleted] = await db
    .delete(budgets)
    .where(eq(budgets.id, id))
    .returning({ id: budgets.id });

  return ok(deleted);
}
