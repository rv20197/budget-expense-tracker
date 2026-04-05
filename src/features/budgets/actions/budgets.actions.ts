"use server";

import { and, asc, eq, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { unexpectedError, validationError } from "@/lib/action-helpers";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { getAuthContext } from "@/lib/auth/getUser";
import type { ActionResult } from "@/lib/types/actions";
import {
  addMonthsClamped,
  formatMonthYear,
  startOfMonth,
  toDecimal,
  toMoneyString,
} from "@/lib/utils";
import { budgetSchema, type BudgetInput } from "@/features/transactions/schemas/finance.schemas";

type RecordScope = "household" | "personal";

function revalidateBudgetPaths() {
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

async function getVisibleCategory(categoryId: string, householdId: string, userId: string) {
  const [category] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.householdId, householdId),
        eq(categories.type, "expense"),
        or(
          eq(categories.scope, "household"),
          and(eq(categories.scope, "personal"), eq(categories.createdBy, userId)),
        ),
      ),
    )
    .limit(1);

  return category ?? null;
}

async function getBudgetForMutation(
  budgetId: string,
  householdId: string,
  userId: string,
) {
  const [budget] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.id, budgetId), eq(budgets.householdId, householdId)))
    .limit(1);

  if (!budget) {
    return null;
  }

  if (budget.scope === "personal" && budget.createdBy !== userId) {
    return null;
  }

  return budget;
}

export async function getBudgets(month: number, year: number) {
  const auth = await getAuthContext().catch(() => null);

  if (!auth) {
    return [];
  }

  const monthStart = startOfMonth(month, year);
  const monthEnd = new Date(year, month, 0);

  const rows = await db
    .select({
      budgetAmount: budgets.amount,
      budgetId: budgets.id,
      categoryColor: categories.color,
      categoryId: categories.id,
      categoryName: categories.name,
      createdBy: budgets.createdBy,
      remainingAmount:
        sql<string>`coalesce(${budgets.amount}, 0) - coalesce(sum(case when ${transactions.transactionDate} between ${monthStart} and ${monthEnd} then ${transactions.amount} else 0 end), 0)`,
      scope: budgets.scope,
      spentAmount:
        sql<string>`coalesce(sum(case when ${transactions.transactionDate} between ${monthStart} and ${monthEnd} then ${transactions.amount} else 0 end), 0)`,
    })
    .from(budgets)
    .innerJoin(categories, eq(categories.id, budgets.categoryId))
    .leftJoin(
      transactions,
      and(
        eq(transactions.categoryId, budgets.categoryId),
        eq(transactions.householdId, auth.householdId),
        eq(transactions.type, "expense"),
      ),
    )
    .where(
      and(
        eq(budgets.householdId, auth.householdId),
        eq(budgets.month, month),
        eq(budgets.year, year),
        or(
          eq(budgets.scope, "household"),
          and(eq(budgets.scope, "personal"), eq(budgets.createdBy, auth.userId)),
        ),
      ),
    )
    .groupBy(budgets.id, categories.id)
    .orderBy(asc(categories.name), asc(budgets.scope));

  return rows.map((row) => {
    const budgetAmount = toDecimal(row.budgetAmount ?? "0");
    const spentAmount = toDecimal(row.spentAmount ?? "0");
    const progress = budgetAmount.greaterThan(0)
      ? spentAmount.dividedBy(budgetAmount).mul(100).toNumber()
      : 0;

    return {
      ...row,
      budgetAmount: toMoneyString(budgetAmount),
      month,
      monthLabel: formatMonthYear(month, year),
      progress,
      isOverBudget:
        spentAmount.greaterThanOrEqualTo(budgetAmount) &&
        budgetAmount.greaterThan(0),
      remainingAmount: toMoneyString(budgetAmount.minus(spentAmount)),
      spentAmount: toMoneyString(spentAmount),
      year,
    };
  });
}

export async function upsertBudget(
  input: BudgetInput,
  scope: RecordScope = "household",
): Promise<ActionResult<{ categoryId: string }, Extract<keyof BudgetInput, string>>> {
  try {
    const payload = budgetSchema.parse(input);
    const { householdId, userId } = await getAuthContext();
    const category = await getVisibleCategory(payload.categoryId, householdId, userId);

    if (!category) {
      return { success: false, error: "Category not found." };
    }

    if (scope === "personal" && category.scope === "personal" && category.createdBy !== userId) {
      return { success: false, error: "Category not found." };
    }

    const [existingBudget] = await db
      .select({ id: budgets.id })
      .from(budgets)
      .where(
        and(
          eq(budgets.householdId, householdId),
          eq(budgets.categoryId, payload.categoryId),
          eq(budgets.month, payload.month),
          eq(budgets.year, payload.year),
          eq(budgets.scope, scope),
          scope === "personal" ? eq(budgets.createdBy, userId) : undefined,
        ),
      )
      .limit(1);

    if (existingBudget) {
      await db
        .update(budgets)
        .set({ amount: payload.amount })
        .where(eq(budgets.id, existingBudget.id));
    } else {
      await db.insert(budgets).values({
        amount: payload.amount,
        categoryId: payload.categoryId,
        createdBy: userId,
        householdId,
        month: payload.month,
        scope,
        year: payload.year,
      });
    }

    revalidateBudgetPaths();

    return { success: true, data: { categoryId: payload.categoryId } };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<Extract<keyof BudgetInput, string>>(error)
      : unexpectedError(
          error instanceof Error ? error.message : "Unable to save budget.",
        );
  }
}

export async function deleteBudget(
  budgetId: string,
): Promise<ActionResult<{ id: string }>> {
  const auth = await getAuthContext().catch(() => null);

  if (!auth) {
    return { success: false, error: "Unauthorized." };
  }

  const budget = await getBudgetForMutation(
    budgetId,
    auth.householdId,
    auth.userId,
  );

  if (!budget) {
    return { success: false, error: "Budget not found." };
  }

  const [deletedBudget] = await db
    .delete(budgets)
    .where(eq(budgets.id, budgetId))
    .returning({ id: budgets.id });

  revalidateBudgetPaths();

  return { success: true, data: deletedBudget };
}

export async function copyBudgetsToNextMonth(
  month: number,
  year: number,
): Promise<ActionResult<{ count: number }>> {
  const auth = await getAuthContext().catch(() => null);

  if (!auth) {
    return { success: false, error: "Unauthorized." };
  }

  const currentMonthBudgets = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.householdId, auth.householdId),
        eq(budgets.month, month),
        eq(budgets.year, year),
        or(
          eq(budgets.scope, "household"),
          and(eq(budgets.scope, "personal"), eq(budgets.createdBy, auth.userId)),
        ),
      ),
    );

  if (currentMonthBudgets.length === 0) {
    return { success: false, error: "No budgets found for the selected month." };
  }

  const nextMonthDate = addMonthsClamped(new Date(year, month - 1, 1), 1);
  const nextMonth = nextMonthDate.getMonth() + 1;
  const nextYear = nextMonthDate.getFullYear();

  for (const budget of currentMonthBudgets) {
    const [existingBudget] = await db
      .select({ id: budgets.id })
      .from(budgets)
      .where(
        and(
          eq(budgets.householdId, budget.householdId),
          eq(budgets.categoryId, budget.categoryId),
          eq(budgets.month, nextMonth),
          eq(budgets.year, nextYear),
          eq(budgets.scope, budget.scope),
          budget.scope === "personal" ? eq(budgets.createdBy, auth.userId) : undefined,
        ),
      )
      .limit(1);

    if (existingBudget) {
      await db
        .update(budgets)
        .set({ amount: budget.amount })
        .where(eq(budgets.id, existingBudget.id));
    } else {
      await db.insert(budgets).values({
        amount: budget.amount,
        categoryId: budget.categoryId,
        createdBy: budget.createdBy,
        householdId: budget.householdId,
        month: nextMonth,
        scope: budget.scope,
        year: nextYear,
      });
    }
  }

  revalidateBudgetPaths();

  return { success: true, data: { count: currentMonthBudgets.length } };
}
