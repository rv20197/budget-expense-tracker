import { and, eq } from "drizzle-orm";
import Decimal from "decimal.js";
import { ZodError } from "zod";

import { db } from "@/db";
import { debtPayments, debts } from "@/db/schema";
import {
  badRequest,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";
import { addMonthsClamped, toMoneyString } from "@/lib/utils";
import { recordPaymentSchema } from "@/features/debts/schemas/debt.schemas";

export async function POST(
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
    const payload = recordPaymentSchema.parse(body);

    const [debt] = await db
      .select()
      .from(debts)
      .where(and(eq(debts.id, id), eq(debts.householdId, householdId)))
      .limit(1);

    if (!debt) return notFound("Debt not found.");
    if (debt.status !== "ACTIVE") {
      return badRequest("Payments can only be recorded on active debts.");
    }

    const paymentAmount = new Decimal(payload.amount);
    const remainingBalance = new Decimal(debt.remainingBalance);

    if (paymentAmount.gt(remainingBalance)) {
      return badRequest("Amount exceeds remaining balance.", {
        amount: ["Amount exceeds remaining balance"],
      });
    }

    const nextRemainingBalance = Decimal.max(
      remainingBalance.minus(paymentAmount),
      0,
    );
    const nextStatus = nextRemainingBalance.lte(0) ? "PAID" : debt.status;
    const nextPaymentDate = debt.nextPaymentDate
      ? addMonthsClamped(debt.nextPaymentDate, 1)
      : null;

    const createdPaymentId = await db.transaction(async (tx) => {
      const [payment] = await tx
        .insert(debtPayments)
        .values({
          amount: toMoneyString(paymentAmount),
          createdBy: userId,
          debtId: debt.id,
          note: payload.note || null,
          paidOn: new Date(payload.paidOn),
        })
        .returning({ id: debtPayments.id });

      await tx
        .update(debts)
        .set({
          nextPaymentDate,
          remainingBalance: toMoneyString(nextRemainingBalance),
          status: nextStatus,
        })
        .where(eq(debts.id, debt.id));

      return payment.id;
    });

    return ok({ id: createdPaymentId }, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest("Validation failed.", error.flatten().fieldErrors as Record<string, string[]>);
    }
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
