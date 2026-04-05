"use server";

import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { unexpectedError, validationError } from "@/lib/action-helpers";
import { db } from "@/db";
import { categories, transactions, users } from "@/db/schema";
import { getAuthContext } from "@/lib/auth/getUser";
import type { ActionResult } from "@/lib/types/actions";
import { toMoneyString } from "@/lib/utils";
import {
  transactionSchema,
  type TransactionInput,
} from "@/features/transactions/schemas/finance.schemas";

type TransactionFilters = {
  search?: string;
  categoryId?: string;
  type?: "income" | "expense";
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "description" | "categoryName" | "transactionDate" | "amount";
  sortOrder?: "asc" | "desc";
};

function revalidateTransactionPaths() {
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/budgets");
}

async function assertCategoryAccess(categoryId: string, userId: string, householdId: string) {
  const [category] = await db
    .select({
      createdBy: categories.createdBy,
      householdId: categories.householdId,
      id: categories.id,
      scope: categories.scope,
    })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.householdId, householdId),
        or(
          eq(categories.scope, "household"),
          and(eq(categories.scope, "personal"), eq(categories.createdBy, userId)),
        ),
      ),
    )
    .limit(1);

  if (!category) {
    throw new Error("Category not found.");
  }
}

export async function getTransactions(filters: TransactionFilters = {}) {
  const auth = await getAuthContext().catch(() => null);

  if (!auth) {
    return {
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
    };
  }

  const conditions = [eq(transactions.householdId, auth.householdId)];

  if (filters.search) {
    conditions.push(ilike(transactions.description, `%${filters.search}%`));
  }

  if (filters.categoryId) {
    conditions.push(eq(transactions.categoryId, filters.categoryId));
  }

  if (filters.type) {
    conditions.push(eq(transactions.type, filters.type));
  }

  if (filters.from) {
    conditions.push(gte(transactions.transactionDate, new Date(filters.from)));
  }

  if (filters.to) {
    conditions.push(lte(transactions.transactionDate, new Date(filters.to)));
  }

  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 10, 1), 50);
  const sortBy = filters.sortBy ?? "transactionDate";
  const sortOrder = filters.sortOrder ?? "desc";
  const where = and(...conditions);

  const orderByClause = [];
  if (sortBy === "description") {
    orderByClause.push(
      sortOrder === "asc" ? transactions.description : desc(transactions.description),
    );
  } else if (sortBy === "categoryName") {
    orderByClause.push(sortOrder === "asc" ? categories.name : desc(categories.name));
  } else if (sortBy === "transactionDate") {
    orderByClause.push(
      sortOrder === "asc" ? transactions.transactionDate : desc(transactions.transactionDate),
    );
  } else if (sortBy === "amount") {
    orderByClause.push(sortOrder === "asc" ? transactions.amount : desc(transactions.amount));
  }
  orderByClause.push(desc(transactions.createdAt));

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        addedByName: users.name,
        amount: transactions.amount,
        categoryColor: categories.color,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        createdBy: transactions.createdBy,
        description: transactions.description,
        id: transactions.id,
        notes: transactions.notes,
        transactionDate: transactions.transactionDate,
        type: transactions.type,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .innerJoin(users, eq(users.id, transactions.createdBy))
      .where(where)
      .orderBy(...orderByClause)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(transactions).where(where),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      amount: toMoneyString(item.amount),
      transactionDate: item.transactionDate.toISOString().slice(0, 10),
    })),
    page,
    pageSize,
    total,
  };
}

export async function createTransaction(
  input: TransactionInput,
): Promise<ActionResult<{ id: string }, Extract<keyof TransactionInput, string>>> {
  try {
    const payload = transactionSchema.parse(input);
    const { householdId, userId } = await getAuthContext();

    await assertCategoryAccess(payload.categoryId, userId, householdId);

    const [createdTransaction] = await db
      .insert(transactions)
      .values({
        amount: payload.amount,
        categoryId: payload.categoryId,
        createdBy: userId,
        description: payload.description,
        householdId,
        notes: payload.notes || null,
        transactionDate: new Date(payload.transactionDate),
        type: payload.type,
      })
      .returning({ id: transactions.id });

    revalidateTransactionPaths();

    return { success: true, data: createdTransaction };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<Extract<keyof TransactionInput, string>>(error)
      : unexpectedError(
          error instanceof Error ? error.message : "Unable to create transaction.",
        );
  }
}

export async function updateTransaction(
  transactionId: string,
  input: TransactionInput,
): Promise<ActionResult<{ id: string }, Extract<keyof TransactionInput, string>>> {
  try {
    const payload = transactionSchema.parse(input);
    const { householdId, userId } = await getAuthContext();

    await assertCategoryAccess(payload.categoryId, userId, householdId);

    const [updatedTransaction] = await db
      .update(transactions)
      .set({
        amount: payload.amount,
        categoryId: payload.categoryId,
        description: payload.description,
        notes: payload.notes || null,
        transactionDate: new Date(payload.transactionDate),
        type: payload.type,
      })
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.householdId, householdId),
        ),
      )
      .returning({ id: transactions.id });

    if (!updatedTransaction) {
      return { success: false, error: "Transaction not found." };
    }

    revalidateTransactionPaths();

    return { success: true, data: updatedTransaction };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<Extract<keyof TransactionInput, string>>(error)
      : unexpectedError(
          error instanceof Error ? error.message : "Unable to update transaction.",
        );
  }
}

export async function deleteTransaction(
  transactionId: string,
): Promise<ActionResult<{ id: string }>> {
  const auth = await getAuthContext().catch(() => null);

  if (!auth) {
    return { success: false, error: "Unauthorized." };
  }

  const [deletedTransaction] = await db
    .delete(transactions)
    .where(
      and(
        eq(transactions.id, transactionId),
        eq(transactions.householdId, auth.householdId),
      ),
    )
    .returning({ id: transactions.id });

  if (!deletedTransaction) {
    return { success: false, error: "Transaction not found." };
  }

  revalidateTransactionPaths();

  return { success: true, data: deletedTransaction };
}

export async function bulkDeleteTransactions(
  transactionIds: string[],
): Promise<ActionResult<{ count: number }>> {
  const auth = await getAuthContext().catch(() => null);

  if (!auth) {
    return { success: false, error: "Unauthorized." };
  }

  if (transactionIds.length === 0) {
    return { success: false, error: "Select at least one transaction." };
  }

  const deletedCount = await db.transaction(async (tx) => {
    const deleted = await tx
      .delete(transactions)
      .where(
        and(
          inArray(transactions.id, transactionIds),
          eq(transactions.householdId, auth.householdId),
        ),
      )
      .returning({ id: transactions.id });

    return deleted.length;
  });

  revalidateTransactionPaths();

  return { success: true, data: { count: deletedCount } };
}
