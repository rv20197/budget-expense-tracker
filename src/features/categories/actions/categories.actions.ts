"use server";

import { and, asc, eq, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { unexpectedError, validationError } from "@/lib/action-helpers";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { getAuthContext } from "@/lib/auth/getUser";
import type { ActionResult } from "@/lib/types/actions";
import {
  categorySchema,
  type CategoryInput,
} from "@/features/transactions/schemas/finance.schemas";

type RecordScope = "household" | "personal";

function revalidateCategoryPaths() {
  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

async function getCategoryForMutation(categoryId: string, householdId: string) {
  const [category] = await db
    .select()
    .from(categories)
    .where(
      and(eq(categories.id, categoryId), eq(categories.householdId, householdId)),
    )
    .limit(1);

  return category ?? null;
}

export async function getCategories(type?: "income" | "expense") {
  const auth = await getAuthContext().catch(() => null);

  if (!auth) {
    return [];
  }

  return db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.householdId, auth.householdId),
        or(
          eq(categories.scope, "household"),
          and(eq(categories.scope, "personal"), eq(categories.createdBy, auth.userId)),
        ),
        type ? eq(categories.type, type) : undefined,
      ),
    )
    .orderBy(asc(categories.type), asc(categories.name));
}

export async function createCategory(
  input: CategoryInput,
  scope: RecordScope = "household",
): Promise<ActionResult<{ id: string }, Extract<keyof CategoryInput, string>>> {
  try {
    const payload = categorySchema.parse(input);
    const { householdId, userId } = await getAuthContext();

    const [createdCategory] = await db
      .insert(categories)
      .values({
        color: payload.color,
        createdBy: userId,
        householdId,
        name: payload.name,
        scope,
        type: payload.type,
      })
      .returning({ id: categories.id });

    revalidateCategoryPaths();

    return { success: true, data: createdCategory };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<Extract<keyof CategoryInput, string>>(error)
      : unexpectedError(
          error instanceof Error ? error.message : "Unable to create category.",
        );
  }
}

export async function updateCategory(
  categoryId: string,
  input: CategoryInput,
): Promise<ActionResult<{ id: string }, Extract<keyof CategoryInput, string>>> {
  try {
    const payload = categorySchema.parse(input);
    const { householdId, userId } = await getAuthContext();
    const category = await getCategoryForMutation(categoryId, householdId);

    if (!category) {
      return { success: false, error: "Category not found." };
    }

    if (category.scope === "personal" && category.createdBy !== userId) {
      return {
        success: false,
        error: "Cannot edit another member's personal category.",
      };
    }

    const [updatedCategory] = await db
      .update(categories)
      .set({
        color: payload.color,
        name: payload.name,
        type: payload.type,
      })
      .where(eq(categories.id, categoryId))
      .returning({ id: categories.id });

    revalidateCategoryPaths();

    return { success: true, data: updatedCategory };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<Extract<keyof CategoryInput, string>>(error)
      : unexpectedError(
          error instanceof Error ? error.message : "Unable to update category.",
        );
  }
}

export async function deleteCategory(
  categoryId: string,
): Promise<ActionResult<{ id: string }>> {
  const auth = await getAuthContext().catch(() => null);

  if (!auth) {
    return { success: false, error: "Unauthorized." };
  }

  const category = await getCategoryForMutation(categoryId, auth.householdId);

  if (!category) {
    return { success: false, error: "Category not found." };
  }

  if (category.scope === "personal" && category.createdBy !== auth.userId) {
    return {
      success: false,
      error: "Cannot delete another member's personal category.",
    };
  }

  const [usage] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.categoryId, categoryId),
        eq(transactions.householdId, auth.householdId),
      ),
    );

  if (Number(usage?.count ?? 0) > 0) {
    return {
      success: false,
      error: "This category has transactions. Reassign them before deleting.",
    };
  }

  const [deletedCategory] = await db
    .delete(categories)
    .where(eq(categories.id, categoryId))
    .returning({ id: categories.id });

  revalidateCategoryPaths();

  return { success: true, data: deletedCategory };
}

export async function reassignCategoryTransactions(
  categoryId: string,
  targetCategoryId: string,
): Promise<ActionResult<{ id: string }>> {
  const auth = await getAuthContext().catch(() => null);

  if (!auth) {
    return { success: false, error: "Unauthorized." };
  }

  if (categoryId === targetCategoryId) {
    return {
      success: false,
      error: "Choose a different category for reassignment.",
    };
  }

  const source = await getCategoryForMutation(categoryId, auth.householdId);
  const target = await getCategoryForMutation(targetCategoryId, auth.householdId);

  if (!source || !target) {
    return { success: false, error: "Category not found." };
  }

  if (source.scope === "personal" && source.createdBy !== auth.userId) {
    return {
      success: false,
      error: "Cannot edit another member's personal category.",
    };
  }

  if (target.scope === "personal" && target.createdBy !== auth.userId) {
    return {
      success: false,
      error: "Choose one of your own visible categories.",
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(transactions)
      .set({ categoryId: targetCategoryId })
      .where(
        and(
          eq(transactions.categoryId, categoryId),
          eq(transactions.householdId, auth.householdId),
        ),
      );

    await tx.delete(categories).where(eq(categories.id, categoryId));
  });

  revalidateCategoryPaths();

  return { success: true, data: { id: categoryId } };
}
