import { asc, desc, eq, sql } from "drizzle-orm";
import Decimal from "decimal.js";
import { ZodError } from "zod";

import { db } from "@/db";
import { debts, users } from "@/db/schema";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";
import { getDateString, toMoneyString } from "@/lib/utils";
import { createDebtSchema } from "@/features/debts/schemas/debt.schemas";

function mapDebt(row: typeof debts.$inferSelect & { addedByName: string }) {
  const principal = new Decimal(row.principal);
  const remainingBalance = new Decimal(row.remainingBalance);
  const amountPaid = Decimal.max(principal.minus(remainingBalance), 0);

  return {
    ...row,
    amountPaid: toMoneyString(amountPaid),
    installmentAmount: row.installmentAmount
      ? toMoneyString(row.installmentAmount)
      : null,
    interestRate: toMoneyString(row.interestRate),
    dueDate: row.dueDate ? getDateString(row.dueDate) : null,
    nextPaymentDate: row.nextPaymentDate
      ? getDateString(row.nextPaymentDate)
      : null,
    principal: toMoneyString(principal),
    remainingBalance: toMoneyString(remainingBalance),
  };
}

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const householdId = session.user.householdId;

  const rows = await db
    .select({
      addedByName: users.name,
      createdAt: debts.createdAt,
      createdBy: debts.createdBy,
      counterparty: debts.counterparty,
      direction: debts.direction,
      dueDate: debts.dueDate,
      id: debts.id,
      installmentAmount: debts.installmentAmount,
      interestRate: debts.interestRate,
      interestType: debts.interestType,
      householdId: debts.householdId,
      name: debts.name,
      nextPaymentDate: debts.nextPaymentDate,
      notes: debts.notes,
      principal: debts.principal,
      remainingBalance: debts.remainingBalance,
      status: debts.status,
      updatedAt: debts.updatedAt,
    })
    .from(debts)
    .innerJoin(users, eq(users.id, debts.createdBy))
    .where(eq(debts.householdId, householdId))
    .orderBy(
      asc(
        sql`case when ${debts.status} = 'PAID' then 1 when ${debts.status} = 'CANCELLED' then 2 else 0 end`,
      ),
      asc(debts.nextPaymentDate),
      desc(debts.createdAt),
    );

  const mapped = rows.map(mapDebt);

  return ok({
    debts: mapped.filter((d) => d.direction === "DEBT"),
    loans: mapped.filter((d) => d.direction === "LOAN"),
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
    const payload = createDebtSchema.parse(body);

    const principal = new Decimal(payload.principal);
    const interestType = payload.interestType;
    const interestRate =
      interestType === "NONE"
        ? new Decimal(0)
        : new Decimal(payload.interestRate);

    const [created] = await db
      .insert(debts)
      .values({
        counterparty: payload.counterparty,
        createdBy: userId,
        direction: payload.direction,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        householdId,
        installmentAmount: payload.installmentAmount
          ? toMoneyString(payload.installmentAmount)
          : null,
        interestRate: toMoneyString(interestRate),
        interestType,
        name: payload.name,
        nextPaymentDate: payload.nextPaymentDate
          ? new Date(payload.nextPaymentDate)
          : null,
        notes: payload.notes || null,
        principal: toMoneyString(principal),
        remainingBalance: toMoneyString(principal),
      })
      .returning({ id: debts.id });

    return ok(created, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest("Validation failed.", error.flatten().fieldErrors as Record<string, string[]>);
    }
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
