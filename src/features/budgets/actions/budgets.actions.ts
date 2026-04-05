"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { unexpectedError, validationError } from "@/lib/action-helpers";
import { getSession } from "@/lib/auth/session";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import type { ActionResult } from "@/lib/types/actions";
import {
  addMonthsClamped,
  formatMonthYear,
  startOfMonth,
  toDecimal,
  toMoneyString,
} from "@/lib/utils";
import { budgetSchema, type BudgetInput } from "@/features/transactions/schemas/finance.schemas";

async function requireSession() {
  return getSession();
}

function revalidateBudgetPaths() {
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function getBudgets(month: number, year: number) {
  const session = await requireSession();

  if (!session) {
    return [];
  }

  const monthStart = startOfMonth(month, year);
  const monthEnd = new Date(year, month, 0);

  const rows = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      categoryColor: categories.color,
      budgetId: budgets.id,
      budgetAmount: budgets.amount,
      spentAmount: sql<string>`coalesce(sum(case when ${transactions.transactionDate} between ${monthStart} and ${monthEnd} then ${transactions.amount} else 0 end), 0)`,
    })
    .from(categories)
    .leftJoin(
      budgets,
      and(
        eq(budgets.categoryId, categories.id),
        eq(budgets.userId, session.user.id),
        eq(budgets.month, month),
        eq(budgets.year, year),
      ),
    )
    .leftJoin(
      transactions,
      and(
        eq(transactions.categoryId, categories.id),
        eq(transactions.userId, session.user.id),
        eq(transactions.type, "expense"),
      ),
    )
    .where(and(eq(categories.userId, session.user.id), eq(categories.type, "expense")))
    .groupBy(categories.id, budgets.id)
    .orderBy(asc(categories.name));

  return rows.map((row) => {
    const budgetAmount = toDecimal(row.budgetAmount ?? "0");
    const spentAmount = toDecimal(row.spentAmount ?? "0");
    const progress = budgetAmount.greaterThan(0)
      ? spentAmount.dividedBy(budgetAmount).mul(100).toNumber()
      : 0;

    return {
      ...row,
      month,
      year,
      monthLabel: formatMonthYear(month, year),
      budgetAmount: toMoneyString(budgetAmount),
      spentAmount: toMoneyString(spentAmount),
      remainingAmount: toMoneyString(budgetAmount.minus(spentAmount)),
      progress,
      isOverBudget:
        spentAmount.greaterThanOrEqualTo(budgetAmount) &&
        budgetAmount.greaterThan(0),
    };
  });
}

export async function upsertBudget(
  input: BudgetInput,
): Promise<ActionResult<{ categoryId: string }, Extract<keyof BudgetInput, string>>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const payload = budgetSchema.parse(input);

    await db
      .insert(budgets)
      .values({
        userId: session.user.id,
        categoryId: payload.categoryId,
        month: payload.month,
        year: payload.year,
        amount: payload.amount,
      })
      .onConflictDoUpdate({
        target: [
          budgets.userId,
          budgets.categoryId,
          budgets.month,
          budgets.year,
        ],
        set: {
          amount: payload.amount,
        },
      });

    revalidateBudgetPaths();

    return { success: true, data: { categoryId: payload.categoryId } };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<Extract<keyof BudgetInput, string>>(error)
      : unexpectedError("Unable to save budget.");
  }
}

export async function deleteBudget(
  budgetId: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  const [deletedBudget] = await db
    .delete(budgets)
    .where(and(eq(budgets.id, budgetId), eq(budgets.userId, session.user.id)))
    .returning({ id: budgets.id });

  if (!deletedBudget) {
    return { success: false, error: "Budget not found." };
  }

  revalidateBudgetPaths();

  return { success: true, data: deletedBudget };
}

export async function copyBudgetsToNextMonth(
  month: number,
  year: number,
): Promise<ActionResult<{ count: number }>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  const currentMonthBudgets = await db
    .select()
    .from(budgets)
    .where(
      and(eq(budgets.userId, session.user.id), eq(budgets.month, month), eq(budgets.year, year)),
    );

  if (currentMonthBudgets.length === 0) {
    return { success: false, error: "No budgets found for the selected month." };
  }

  const nextMonthDate = addMonthsClamped(new Date(year, month - 1, 1), 1);
  const nextMonth = nextMonthDate.getMonth() + 1;
  const nextYear = nextMonthDate.getFullYear();

  for (const budget of currentMonthBudgets) {
    await db
      .insert(budgets)
      .values({
        userId: session.user.id,
        categoryId: budget.categoryId,
        month: nextMonth,
        year: nextYear,
        amount: budget.amount,
      })
      .onConflictDoUpdate({
        target: [
          budgets.userId,
          budgets.categoryId,
          budgets.month,
          budgets.year,
        ],
        set: {
          amount: budget.amount,
        },
      });
  }

  revalidateBudgetPaths();

  return { success: true, data: { count: currentMonthBudgets.length } };
}
