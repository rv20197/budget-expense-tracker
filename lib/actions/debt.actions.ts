"use server";

import { and, asc, desc, eq, lt, lte, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { ZodError } from "zod";

import { unexpectedError, validationError } from "@/lib/action-helpers";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { debtPayments, debts } from "@/lib/db/schema";
import type { ActionResult } from "@/lib/types/actions";
import { addMonthsClamped, getDateString, toMoneyString } from "@/lib/utils";
import {
  createDebtSchema,
  recordPaymentSchema,
  updateDebtSchema,
  type CreateDebtInput,
  type RecordPaymentInput,
  type UpdateDebtInput,
} from "@/lib/validations/debt.schemas";

async function requireSession() {
  return getSession();
}

function revalidateDebtPaths() {
  revalidatePath("/debt");
  revalidatePath("/dashboard");
}

function decimal(value: Decimal.Value) {
  return new Decimal(value);
}

function mapDebtRow(
  row: typeof debts.$inferSelect,
  paymentTotal: string,
  payments: Array<typeof debtPayments.$inferSelect>,
) {
  const principal = decimal(row.principal);
  const remainingBalance = decimal(row.remainingBalance);
  const amountPaid = decimal(paymentTotal);

  return {
    ...row,
    principal: toMoneyString(principal),
    remainingBalance: toMoneyString(remainingBalance),
    amountPaid: toMoneyString(amountPaid),
    interestRate: toMoneyString(row.interestRate),
    installmentAmount: row.installmentAmount
      ? toMoneyString(row.installmentAmount)
      : null,
    dueDate: row.dueDate ? getDateString(row.dueDate) : null,
    nextPaymentDate: row.nextPaymentDate ? getDateString(row.nextPaymentDate) : null,
    payments: payments.map((payment) => ({
      ...payment,
      amount: toMoneyString(payment.amount),
      paidOn: getDateString(payment.paidOn),
    })),
  };
}

function calculateProjection(
  remainingBalance: Decimal,
  installmentAmount: Decimal,
  interestRate: Decimal,
  interestType: "NONE" | "SIMPLE" | "COMPOUND",
) {
  if (installmentAmount.lte(0)) {
    return null;
  }

  let balance = remainingBalance;
  let months = 0;
  const monthlyRate =
    interestType === "NONE" ? new Decimal(0) : interestRate.div(100).div(12);

  while (balance.gt(0) && months < 1200) {
    if (interestType === "SIMPLE") {
      balance = balance.plus(remainingBalance.mul(monthlyRate));
    }

    if (interestType === "COMPOUND") {
      balance = balance.plus(balance.mul(monthlyRate));
    }

    balance = balance.minus(installmentAmount);
    months += 1;

    if (balance.gt(0) && installmentAmount.lte(balance.mul(monthlyRate))) {
      return null;
    }
  }

  if (months === 0 || months >= 1200) {
    return null;
  }

  const projectedDate = addMonthsClamped(new Date(), months);

  return {
    months,
    projectedPayoffDate: getDateString(projectedDate),
  };
}

export async function getDebts() {
  const session = await requireSession();

  if (!session) {
    return { debts: [], loans: [] };
  }

  const [debtRows, paymentTotals, payments] = await Promise.all([
    db
      .select()
      .from(debts)
      .where(eq(debts.userId, session.user.id))
      .orderBy(
        asc(
          sql`case when ${debts.status} = 'PAID' then 1 when ${debts.status} = 'CANCELLED' then 2 else 0 end`,
        ),
        asc(debts.nextPaymentDate),
        desc(debts.createdAt),
      ),
    db
      .select({
        debtId: debtPayments.debtId,
        total: sql<string>`coalesce(sum(${debtPayments.amount}), 0)`,
      })
      .from(debtPayments)
      .where(eq(debtPayments.userId, session.user.id))
      .groupBy(debtPayments.debtId),
    db
      .select()
      .from(debtPayments)
      .where(eq(debtPayments.userId, session.user.id))
      .orderBy(desc(debtPayments.paidOn), desc(debtPayments.createdAt)),
  ]);

  const paymentTotalsByDebt = new Map(
    paymentTotals.map((item) => [item.debtId, item.total]),
  );
  const paymentsByDebt = new Map<string, Array<typeof debtPayments.$inferSelect>>();

  for (const payment of payments) {
    const list = paymentsByDebt.get(payment.debtId) ?? [];
    list.push(payment);
    paymentsByDebt.set(payment.debtId, list);
  }

  const mapped = debtRows.map((row) =>
    mapDebtRow(
      row,
      paymentTotalsByDebt.get(row.id) ?? "0",
      paymentsByDebt.get(row.id) ?? [],
    ),
  );

  return {
    debts: mapped.filter((item) => item.direction === "DEBT"),
    loans: mapped.filter((item) => item.direction === "LOAN"),
  };
}

export async function createDebt(
  input: CreateDebtInput,
): Promise<ActionResult<{ id: string }, Extract<keyof CreateDebtInput, string>>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const payload = createDebtSchema.parse(input);
    const principal = decimal(payload.principal);
    const interestType = payload.interestType;
    const interestRate =
      interestType === "NONE" ? new Decimal(0) : decimal(payload.interestRate);

    const [createdDebt] = await db
      .insert(debts)
      .values({
        userId: session.user.id,
        name: payload.name,
        direction: payload.direction,
        counterparty: payload.counterparty,
        principal: toMoneyString(principal),
        remainingBalance: toMoneyString(principal),
        interestRate: toMoneyString(interestRate),
        interestType,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        nextPaymentDate: payload.nextPaymentDate
          ? new Date(payload.nextPaymentDate)
          : null,
        installmentAmount: payload.installmentAmount
          ? toMoneyString(payload.installmentAmount)
          : null,
        notes: payload.notes || null,
      })
      .returning({ id: debts.id });

    revalidateDebtPaths();

    return { success: true, data: createdDebt };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<Extract<keyof CreateDebtInput, string>>(error)
      : unexpectedError("Unable to create debt.");
  }
}

export async function updateDebt(
  debtId: string,
  input: UpdateDebtInput,
): Promise<ActionResult<{ id: string }, Extract<keyof UpdateDebtInput, string>>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const payload = updateDebtSchema.parse(input);
    const interestType = payload.interestType;
    const interestRate =
      interestType === "NONE" ? "0.00" : toMoneyString(payload.interestRate);

    const [updatedDebt] = await db
      .update(debts)
      .set({
        name: payload.name,
        counterparty: payload.counterparty,
        interestRate,
        interestType,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        nextPaymentDate: payload.nextPaymentDate
          ? new Date(payload.nextPaymentDate)
          : null,
        installmentAmount: payload.installmentAmount
          ? toMoneyString(payload.installmentAmount)
          : null,
        notes: payload.notes || null,
      })
      .where(and(eq(debts.id, debtId), eq(debts.userId, session.user.id)))
      .returning({ id: debts.id });

    if (!updatedDebt) {
      return { success: false, error: "Debt not found." };
    }

    revalidateDebtPaths();

    return { success: true, data: updatedDebt };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<Extract<keyof UpdateDebtInput, string>>(error)
      : unexpectedError("Unable to update debt.");
  }
}

export async function recordPayment(
  debtId: string,
  input: RecordPaymentInput,
): Promise<ActionResult<{ id: string }, Extract<keyof RecordPaymentInput, string>>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const payload = recordPaymentSchema.parse(input);
    const [debt] = await db
      .select()
      .from(debts)
      .where(and(eq(debts.id, debtId), eq(debts.userId, session.user.id)))
      .limit(1);

    if (!debt) {
      return { success: false, error: "Debt not found." };
    }

    if (debt.status !== "ACTIVE") {
      return {
        success: false,
        error: "Payments can only be recorded on active debts.",
      };
    }

    const paymentAmount = decimal(payload.amount);
    const remainingBalance = decimal(debt.remainingBalance);

    if (paymentAmount.gt(remainingBalance)) {
      return {
        success: false,
        error: "Amount exceeds remaining balance",
        fieldErrors: {
          amount: ["Amount exceeds remaining balance"],
        },
      };
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
          debtId: debt.id,
          userId: session.user.id,
          amount: toMoneyString(paymentAmount),
          paidOn: new Date(payload.paidOn),
          note: payload.note || null,
        })
        .returning({ id: debtPayments.id });

      await tx
        .update(debts)
        .set({
          remainingBalance: toMoneyString(nextRemainingBalance),
          status: nextStatus,
          nextPaymentDate,
        })
        .where(eq(debts.id, debt.id));

      return payment.id;
    });

    revalidateDebtPaths();

    return { success: true, data: { id: createdPaymentId } };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<Extract<keyof RecordPaymentInput, string>>(error)
      : unexpectedError("Unable to record payment.");
  }
}

export async function cancelDebt(
  debtId: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  const [updatedDebt] = await db
    .update(debts)
    .set({
      status: "CANCELLED",
    })
    .where(and(eq(debts.id, debtId), eq(debts.userId, session.user.id)))
    .returning({ id: debts.id });

  if (!updatedDebt) {
    return { success: false, error: "Debt not found." };
  }

  revalidateDebtPaths();

  return { success: true, data: updatedDebt };
}

export async function deletePayment(
  paymentId: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  const [payment] = await db
    .select()
    .from(debtPayments)
    .where(and(eq(debtPayments.id, paymentId), eq(debtPayments.userId, session.user.id)))
    .limit(1);

  if (!payment) {
    return { success: false, error: "Payment not found." };
  }

  const result = await db.transaction(async (tx) => {
    await tx
      .delete(debtPayments)
      .where(and(eq(debtPayments.id, paymentId), eq(debtPayments.userId, session.user.id)));

    const [debt] = await tx
      .select()
      .from(debts)
      .where(and(eq(debts.id, payment.debtId), eq(debts.userId, session.user.id)))
      .limit(1);

    if (!debt) {
      throw new Error("Debt not found.");
    }

    const [paymentSum] = await tx
      .select({
        total: sql<string>`coalesce(sum(${debtPayments.amount}), 0)`,
      })
      .from(debtPayments)
      .where(eq(debtPayments.debtId, debt.id));

    const nextRemainingBalance = decimal(debt.principal).minus(
      decimal(paymentSum?.total ?? "0"),
    );

    if (nextRemainingBalance.lt(0)) {
      throw new Error("Deleting this payment would make the balance negative.");
    }

    const nextStatus =
      nextRemainingBalance.gt(0) && debt.status === "PAID"
        ? "ACTIVE"
        : debt.status;

    await tx
      .update(debts)
      .set({
        remainingBalance: toMoneyString(nextRemainingBalance),
        status: nextStatus,
      })
      .where(eq(debts.id, debt.id));

    return { id: paymentId };
  });

  revalidateDebtPaths();

  return { success: true, data: result };
}

export async function getDebtSummary(userId: string) {
  "use cache";

  const today = new Date();
  const nextWeek = addMonthsClamped(today, 0);
  nextWeek.setDate(today.getDate() + 7);

  const [debtTotal, loanTotal, overdueCount, dueSoonCount] = await Promise.all([
    db
      .select({
        total: sql<string>`coalesce(sum(${debts.remainingBalance}), 0)`,
      })
      .from(debts)
      .where(
        and(
          eq(debts.userId, userId),
          eq(debts.direction, "DEBT"),
          eq(debts.status, "ACTIVE"),
        ),
      ),
    db
      .select({
        total: sql<string>`coalesce(sum(${debts.remainingBalance}), 0)`,
      })
      .from(debts)
      .where(
        and(
          eq(debts.userId, userId),
          eq(debts.direction, "LOAN"),
          eq(debts.status, "ACTIVE"),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(debts)
      .where(
        and(
          eq(debts.userId, userId),
          eq(debts.status, "ACTIVE"),
          lt(debts.nextPaymentDate, today),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(debts)
      .where(
        and(
          eq(debts.userId, userId),
          eq(debts.status, "ACTIVE"),
          gte(debts.nextPaymentDate, today),
          lte(debts.nextPaymentDate, nextWeek),
        ),
      ),
  ]);

  return {
    totalDebt: toMoneyString(debtTotal[0]?.total ?? "0"),
    totalLoan: toMoneyString(loanTotal[0]?.total ?? "0"),
    overdueCount: Number(overdueCount[0]?.count ?? 0),
    dueSoonCount: Number(dueSoonCount[0]?.count ?? 0),
  };
}

export async function getPayoffProjection(debtId: string) {
  const session = await requireSession();

  if (!session) {
    return null;
  }

  const [debt] = await db
    .select()
    .from(debts)
    .where(and(eq(debts.id, debtId), eq(debts.userId, session.user.id)))
    .limit(1);

  if (!debt || !debt.installmentAmount) {
    return null;
  }

  return calculateProjection(
    decimal(debt.remainingBalance),
    decimal(debt.installmentAmount),
    decimal(debt.interestRate),
    debt.interestType,
  );
}
