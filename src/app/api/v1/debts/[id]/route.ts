import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";

import { db } from "@/db";
import { debts } from "@/db/schema";
import {
  badRequest,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";
import { toMoneyString } from "@/lib/utils";
import { updateDebtSchema } from "@/features/debts/schemas/debt.schemas";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const { id } = await params;
  const householdId = session.user.householdId;

  try {
    const body = await request.json();
    const payload = updateDebtSchema.parse(body);

    const interestType = payload.interestType;
    const interestRate =
      interestType === "NONE" ? "0.00" : toMoneyString(payload.interestRate);

    const [updated] = await db
      .update(debts)
      .set({
        counterparty: payload.counterparty,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        installmentAmount: payload.installmentAmount
          ? toMoneyString(payload.installmentAmount)
          : null,
        interestRate,
        interestType,
        name: payload.name,
        nextPaymentDate: payload.nextPaymentDate
          ? new Date(payload.nextPaymentDate)
          : null,
        notes: payload.notes || null,
      })
      .where(and(eq(debts.id, id), eq(debts.householdId, householdId)))
      .returning({ id: debts.id });

    if (!updated) return notFound("Debt not found.");

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
    .delete(debts)
    .where(and(eq(debts.id, id), eq(debts.householdId, householdId)))
    .returning({ id: debts.id });

  if (!deleted) return notFound("Debt not found.");

  return ok(deleted);
}
