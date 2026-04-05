"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { unexpectedError, validationError } from "@/lib/action-helpers";
import { getSession } from "@/lib/auth/session";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import type { ActionResult } from "@/lib/types/actions";
import {
  categorySchema,
  type CategoryInput,
} from "@/features/transactions/schemas/finance.schemas";

async function requireSession() {
  const session = await getSession();
  if (!session) {
    return null;
  }
  return session;
}

function revalidateCategoryPaths() {
  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function getCategories(type?: "income" | "expense") {
  const session = await requireSession();

  if (!session) {
    return [];
  }

  return db
    .select()
    .from(categories)
    .where(
      type
        ? and(eq(categories.userId, session.user.id), eq(categories.type, type))
        : eq(categories.userId, session.user.id),
    )
    .orderBy(asc(categories.type), asc(categories.name));
}

export async function createCategory(
  input: CategoryInput,
): Promise<ActionResult<{ id: string }, Extract<keyof CategoryInput, string>>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const payload = categorySchema.parse(input);
    const [createdCategory] = await db
      .insert(categories)
      .values({
        userId: session.user.id,
        name: payload.name,
        type: payload.type,
        color: payload.color,
      })
      .returning({ id: categories.id });

    revalidateCategoryPaths();

    return { success: true, data: createdCategory };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<Extract<keyof CategoryInput, string>>(error)
      : unexpectedError("Unable to create category.");
  }
}

export async function updateCategory(
  categoryId: string,
  input: CategoryInput,
): Promise<ActionResult<{ id: string }, Extract<keyof CategoryInput, string>>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const payload = categorySchema.parse(input);
    const [updatedCategory] = await db
      .update(categories)
      .set({
        name: payload.name,
        type: payload.type,
        color: payload.color,
      })
      .where(and(eq(categories.id, categoryId), eq(categories.userId, session.user.id)))
      .returning({ id: categories.id });

    if (!updatedCategory) {
      return { success: false, error: "Category not found." };
    }

    revalidateCategoryPaths();

    return { success: true, data: updatedCategory };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<Extract<keyof CategoryInput, string>>(error)
      : unexpectedError("Unable to update category.");
  }
}

export async function deleteCategory(
  categoryId: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  const [usage] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.categoryId, categoryId),
        eq(transactions.userId, session.user.id),
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
    .where(and(eq(categories.id, categoryId), eq(categories.userId, session.user.id)))
    .returning({ id: categories.id });

  if (!deletedCategory) {
    return { success: false, error: "Category not found." };
  }

  revalidateCategoryPaths();

  return { success: true, data: deletedCategory };
}

export async function reassignCategoryTransactions(
  categoryId: string,
  targetCategoryId: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  if (categoryId === targetCategoryId) {
    return {
      success: false,
      error: "Choose a different category for reassignment.",
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(transactions)
      .set({ categoryId: targetCategoryId })
      .where(
        and(
          eq(transactions.categoryId, categoryId),
          eq(transactions.userId, session.user.id),
        ),
      );

    await tx
      .delete(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, session.user.id)));
  });

  revalidateCategoryPaths();

  return { success: true, data: { id: categoryId } };
}
