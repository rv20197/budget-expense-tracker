"use server";

import { and, asc, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Decimal from "decimal.js";
import { ZodError } from "zod";

import { unexpectedError, validationError } from "@/lib/action-helpers";
import { db } from "@/db";
import { debtPayments, debts, users } from "@/db/schema";
import { getAuthContext } from "@/lib/auth/getUser";
import type { ActionResult } from "@/lib/types/actions";
import { addMonthsClamped, getDateString, toMoneyString } from "@/lib/utils";
import { calculatePayoffMonths } from "@/features/debts/lib/projection";
import { calculateNextPaymentDates } from "@/features/debts/lib/dates";
import {
  createDebtSchema,
  recordPaymentSchema,
  updateDebtSchema,
  type CreateDebtInput,
  type RecordPaymentInput,
  type UpdateDebtInput,
} from "@/features/debts/schemas/debt.schemas";
import { logger } from "@/lib/logger";

function revalidateDebtPaths() {
  revalidatePath("/debt");
  revalidatePath("/dashboard");
}

function decimal(value: Decimal.Value) {
  return new Decimal(value);
}

function mapDebtRow(row: typeof debts.$inferSelect & { addedByName: string }) {
  const principal = decimal(row.principal);
  const remainingBalance = decimal(row.remainingBalance);
  const amountPaid = Decimal.max(principal.minus(remainingBalance), 0);

  return {
    ...row,
    amountPaid: toMoneyString(amountPaid),
    installmentAmount: row.installmentAmount
      ? toMoneyString(row.installmentAmount)
      : null,
    interestRate: toMoneyString(row.interestRate),
    dueDate: row.dueDate ? getDateString(row.dueDate) : null,
    nextPaymentDate: row.nextPaymentDate ? getDateString(row.nextPaymentDate) : null,
    principal: toMoneyString(principal),
    remainingBalance: toMoneyString(remainingBalance),
  };
}

function calculateProjection(
  principal: Decimal,
  remainingBalance: Decimal,
  installmentAmount: Decimal,
  interestRate: Decimal,
  interestType: "NONE" | "SIMPLE" | "COMPOUND",
) {
  const months = calculatePayoffMonths(
    principal,
    remainingBalance,
    installmentAmount,
    interestRate,
    interestType,
  );

  if (months === null) {
    return null;
  }

  return {
    months,
    projectedPayoffDate: getDateString(addMonthsClamped(new Date(), months)),
  };
}

async function getDebtForHousehold(debtId: string, householdId: string) {
  const [debt] = await db
    .select()
    .from(debts)
    .where(and(eq(debts.id, debtId), eq(debts.householdId, householdId)))
    .limit(1);

  return debt ?? null;
}

export async function getDebts() {
  const auth = await getAuthContext().catch(() => null);

  if (!auth) {
    logger.debug("DebtActions", "getDebts rejected: Unauthenticated");
    return { debts: [], loans: [] };
  }

  logger.debug("DebtActions", `Fetching debts for household: ${auth.householdId}`);

  const debtRows = await db
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
    .where(eq(debts.householdId, auth.householdId))
    .orderBy(
      asc(
        sql`case when ${debts.status} = 'PAID' then 1 when ${debts.status} = 'CANCELLED' then 2 else 0 end`,
      ),
      asc(debts.nextPaymentDate),
      desc(debts.createdAt),
    );

  const mapped = debtRows.map(mapDebtRow);

  return {
    debts: mapped.filter((item) => item.direction === "DEBT"),
    loans: mapped.filter((item) => item.direction === "LOAN"),
  };
}

export async function createDebt(
  input: CreateDebtInput,
): Promise<ActionResult<{ id: string }, Extract<keyof CreateDebtInput, string>>> {
  logger.info("DebtActions", `Creating debt record: ${input.name} (${input.direction})`, input);
  try {
    const payload = createDebtSchema.parse(input);
    const { householdId, userId } = await getAuthContext();
    const principal = decimal(payload.principal);
    const interestType = payload.interestType;
    const interestRate =
      interestType === "NONE" ? new Decimal(0) : decimal(payload.interestRate);

    const [createdDebt] = await db
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

    revalidateDebtPaths();

    logger.info("DebtActions", `Debt created successfully: ${createdDebt.id}`);
    return { success: true, data: createdDebt };
  } catch (error) {
    logger.error("DebtActions", `Error creating debt: ${input.name}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return error instanceof ZodError
      ? validationError<Extract<keyof CreateDebtInput, string>>(error)
      : unexpectedError(error instanceof Error ? error.message : "Unable to create debt.");
  }
}

export async function updateDebt(
  debtId: string,
  input: UpdateDebtInput,
): Promise<ActionResult<{ id: string }, Extract<keyof CreateDebtInput, string>>> {
  logger.info("DebtActions", `Updating debt record ${debtId}`, input);
  try {
    const payload = updateDebtSchema.parse(input);
    const { householdId } = await getAuthContext();
    const interestType = payload.interestType;
    const interestRate =
      interestType === "NONE" ? "0.00" : toMoneyString(payload.interestRate);

    const [updatedDebt] = await db
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
      .where(and(eq(debts.id, debtId), eq(debts.householdId, householdId)))
      .returning({ id: debts.id });

    if (!updatedDebt) {
      logger.warn("DebtActions", `Debt not found for update: ${debtId}`);
      return { success: false, error: "Debt not found." };
    }

    revalidateDebtPaths();

    logger.info("DebtActions", `Debt updated successfully: ${debtId}`);
    return { success: true, data: updatedDebt };
  } catch (error) {
    logger.error("DebtActions", `Error updating debt: ${debtId}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return error instanceof ZodError
      ? validationError<Extract<keyof UpdateDebtInput, string>>(error)
      : unexpectedError(error instanceof Error ? error.message : "Unable to update debt.");
  }
}

export async function recordPayment(
  debtId: string,
  input: RecordPaymentInput,
): Promise<ActionResult<{ id: string }, Extract<keyof RecordPaymentInput, string>>> {
  logger.info("DebtActions", `Recording payment for debt ${debtId}: ${input.amount}`, input);
  try {
    const payload = recordPaymentSchema.parse(input);
    const { householdId, userId } = await getAuthContext();
    const debt = await getDebtForHousehold(debtId, householdId);

    if (!debt) {
      logger.warn("DebtActions", `Debt not found for payment: ${debtId}`);
      return { success: false, error: "Debt not found." };
    }

    if (debt.status !== "ACTIVE") {
      logger.warn("DebtActions", `Payment attempted on inactive debt ${debtId} (status: ${debt.status})`);
      return {
        success: false,
        error: "Payments can only be recorded on active debts.",
      };
    }

    const paymentAmount = decimal(payload.amount);
    const remainingBalance = decimal(debt.remainingBalance);

    if (paymentAmount.gt(remainingBalance)) {
      logger.warn("DebtActions", `Payment ${paymentAmount} exceeds remaining balance ${remainingBalance} for debt ${debtId}`);
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
    const isFullyPaid = nextRemainingBalance.lte(0);
    const nextStatus = isFullyPaid ? "PAID" : debt.status;
    const { dueDate: nextDueDate, nextPaymentDate } = calculateNextPaymentDates(
      {
        dueDate: debt.dueDate,
        nextPaymentDate: debt.nextPaymentDate,
      },
      isFullyPaid,
    );

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
          dueDate: nextDueDate,
          nextPaymentDate,
          remainingBalance: toMoneyString(nextRemainingBalance),
          status: nextStatus,
        })
        .where(eq(debts.id, debt.id));

      return payment.id;
    });

    revalidateDebtPaths();

    logger.info("DebtActions", `Recorded payment ${createdPaymentId} for debt ${debtId}. Status: ${nextStatus}, NextDueDate: ${nextDueDate}`);
    return { success: true, data: { id: createdPaymentId } };
  } catch (error) {
    logger.error("DebtActions", `Error recording payment for debt: ${debtId}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return error instanceof ZodError
      ? validationError<Extract<keyof RecordPaymentInput, string>>(error)
      : unexpectedError(error instanceof Error ? error.message : "Unable to record payment.");
  }
}

export async function cancelDebt(
  debtId: string,
): Promise<ActionResult<{ id: string }>> {
  logger.info("DebtActions", `Cancelling debt: ${debtId}`);
  const auth = await getAuthContext().catch(() => null);

  if (!auth) {
    logger.warn("DebtActions", "cancelDebt rejected: Unauthorized");
    return { success: false, error: "Unauthorized." };
  }

  const [updatedDebt] = await db
    .update(debts)
    .set({
      status: "CANCELLED",
    })
    .where(and(eq(debts.id, debtId), eq(debts.householdId, auth.householdId)))
    .returning({ id: debts.id });

  if (!updatedDebt) {
    logger.warn("DebtActions", `Debt not found for cancellation: ${debtId}`);
    return { success: false, error: "Debt not found." };
  }

  revalidateDebtPaths();

  logger.info("DebtActions", `Debt cancelled successfully: ${debtId}`);
  return { success: true, data: updatedDebt };
}

export async function deletePayment(
  paymentId: string,
): Promise<ActionResult<{ id: string }>> {
  logger.info("DebtActions", `Deleting debt payment: ${paymentId}`);
  const auth = await getAuthContext().catch(() => null);

  if (!auth) {
    logger.warn("DebtActions", "deletePayment rejected: Unauthorized");
    return { success: false, error: "Unauthorized." };
  }

  const [payment] = await db
    .select({
      debtId: debtPayments.debtId,
      id: debtPayments.id,
    })
    .from(debtPayments)
    .innerJoin(debts, eq(debts.id, debtPayments.debtId))
    .where(
      and(
        eq(debtPayments.id, paymentId),
        eq(debts.householdId, auth.householdId),
      ),
    )
    .limit(1);

  if (!payment) {
    logger.warn("DebtActions", `Payment not found for deletion: ${paymentId}`);
    return { success: false, error: "Payment not found." };
  }

  const result = await db.transaction(async (tx) => {
    await tx.delete(debtPayments).where(eq(debtPayments.id, paymentId));

    const [debt] = await tx
      .select()
      .from(debts)
      .where(and(eq(debts.id, payment.debtId), eq(debts.householdId, auth.householdId)))
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

  logger.info("DebtActions", `Payment deleted successfully: ${paymentId}`);
  return { success: true, data: result };
}

export async function getDebtSummary(householdId: string) {
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
          eq(debts.householdId, householdId),
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
          eq(debts.householdId, householdId),
          eq(debts.direction, "LOAN"),
          eq(debts.status, "ACTIVE"),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(debts)
      .where(
        and(
          eq(debts.householdId, householdId),
          eq(debts.status, "ACTIVE"),
          lt(debts.nextPaymentDate, today),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(debts)
      .where(
        and(
          eq(debts.householdId, householdId),
          eq(debts.status, "ACTIVE"),
          gte(debts.nextPaymentDate, today),
          lte(debts.nextPaymentDate, nextWeek),
        ),
      ),
  ]);

  return {
    dueSoonCount: Number(dueSoonCount[0]?.count ?? 0),
    overdueCount: Number(overdueCount[0]?.count ?? 0),
    totalDebt: toMoneyString(debtTotal[0]?.total ?? "0"),
    totalLoan: toMoneyString(loanTotal[0]?.total ?? "0"),
  };
}

export async function getPayoffProjection(debtId: string) {
  const auth = await getAuthContext().catch(() => null);

  if (!auth) {
    return null;
  }

  const debt = await getDebtForHousehold(debtId, auth.householdId);

  if (!debt || !debt.installmentAmount) {
    return null;
  }

  return calculateProjection(
    decimal(debt.principal),
    decimal(debt.remainingBalance),
    decimal(debt.installmentAmount),
    decimal(debt.interestRate),
    debt.interestType,
  );
}

const PAYMENT_PAGE_SIZE = 10;

export type PaymentHistoryPage = {
  items: Array<{
    id: string;
    amount: string;
    paidOn: string;
    note: string | null;
  }>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export async function getPaymentHistory(
  debtId: string,
  page = 1,
): Promise<PaymentHistoryPage | null> {
  const auth = await getAuthContext().catch(() => null);

  if (!auth) {
    return null;
  }

  const debt = await getDebtForHousehold(debtId, auth.householdId);

  if (!debt) {
    return null;
  }

  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * PAYMENT_PAGE_SIZE;

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: debtPayments.id,
        amount: debtPayments.amount,
        paidOn: debtPayments.paidOn,
        note: debtPayments.note,
      })
      .from(debtPayments)
      .where(eq(debtPayments.debtId, debtId))
      .orderBy(desc(debtPayments.paidOn), desc(debtPayments.createdAt))
      .limit(PAYMENT_PAGE_SIZE)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(debtPayments)
      .where(eq(debtPayments.debtId, debtId)),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      amount: toMoneyString(item.amount),
      paidOn: getDateString(item.paidOn),
    })),
    page: safePage,
    pageSize: PAYMENT_PAGE_SIZE,
    total,
    totalPages: Math.ceil(total / PAYMENT_PAGE_SIZE),
  };
}
