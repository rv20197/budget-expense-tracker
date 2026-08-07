import { and, eq } from "drizzle-orm";
import Decimal from "decimal.js";

import { db } from "@/db";
import { categories, debtPayments, debts, transactions } from "@/db/schema";
import { toMoneyString } from "@/lib/utils";
import { calculateNextPaymentDates } from "@/features/debts/lib/dates";

type DebtRow = typeof debts.$inferSelect;

export async function getOrCreateDebtCategory(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  householdId: string,
  userId: string,
  type: "expense" | "income",
): Promise<string> {
  const defaultName = type === "expense" ? "Debt Payment" : "Loan Repayment";
  const alternateNames =
    type === "expense"
      ? ["debt payment", "debt repayment", "debt", "debts"]
      : ["loan repayment", "loan payment", "loan", "loans"];

  const existingCategories = await tx
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.householdId, householdId),
        eq(categories.type, type),
      ),
    );

  let match = existingCategories.find((c) =>
    alternateNames.includes(c.name.toLowerCase().trim()),
  );

  if (!match) {
    match = existingCategories.find((c) => c.name.toLowerCase().trim() === "others");
  }

  if (!match && existingCategories.length > 0) {
    match = existingCategories[0];
  }

  if (match) {
    return match.id;
  }

  const [created] = await tx
    .insert(categories)
    .values({
      householdId,
      createdBy: userId,
      scope: "household",
      name: defaultName,
      type,
      color: type === "expense" ? "#f43f5e" : "#10b981",
      isDefault: true,
    })
    .returning({ id: categories.id });

  return created.id;
}

export async function recordDebtPaymentInDb(params: {
  debt: DebtRow;
  userId: string;
  householdId: string;
  paymentAmount: Decimal;
  paidOn: string;
  note?: string | null;
}): Promise<string> {
  const { debt, userId, householdId, paymentAmount, paidOn, note } = params;

  const remainingBalance = new Decimal(debt.remainingBalance);
  const nextRemainingBalance = Decimal.max(remainingBalance.minus(paymentAmount), 0);
  const isFullyPaid = nextRemainingBalance.lte(0);
  const nextStatus = isFullyPaid ? "PAID" : debt.status;

  const { dueDate: nextDueDate, nextPaymentDate } = calculateNextPaymentDates(
    {
      dueDate: debt.dueDate,
      nextPaymentDate: debt.nextPaymentDate,
    },
    isFullyPaid,
  );

  const targetType = debt.direction === "DEBT" ? "expense" : "income";
  const description =
    debt.direction === "DEBT"
      ? `Debt payment: ${debt.name}`
      : `Loan repayment: ${debt.name}`;

  const createdPaymentId = await db.transaction(async (tx) => {
    const categoryId = await getOrCreateDebtCategory(tx, householdId, userId, targetType);

    const [createdTransaction] = await tx
      .insert(transactions)
      .values({
        amount: toMoneyString(paymentAmount),
        categoryId,
        createdBy: userId,
        description,
        householdId,
        notes: note || null,
        transactionDate: new Date(paidOn),
        type: targetType,
      })
      .returning({ id: transactions.id });

    let paymentId: string;
    try {
      const [payment] = await tx
        .insert(debtPayments)
        .values({
          amount: toMoneyString(paymentAmount),
          createdBy: userId,
          debtId: debt.id,
          transactionId: createdTransaction.id,
          note: note || null,
          paidOn: new Date(paidOn),
        })
        .returning({ id: debtPayments.id });
      paymentId = payment.id;
    } catch (err: any) {
      if (err?.code === "42703" || String(err?.message || "").includes("transaction_id")) {
        const [payment] = await tx
          .insert(debtPayments)
          .values({
            amount: toMoneyString(paymentAmount),
            createdBy: userId,
            debtId: debt.id,
            note: note || null,
            paidOn: new Date(paidOn),
          })
          .returning({ id: debtPayments.id });
        paymentId = payment.id;
      } else {
        throw err;
      }
    }

    await tx
      .update(debts)
      .set({
        dueDate: nextDueDate,
        nextPaymentDate,
        remainingBalance: toMoneyString(nextRemainingBalance),
        status: nextStatus,
      })
      .where(eq(debts.id, debt.id));

    return paymentId;
  });

  return createdPaymentId;
}
