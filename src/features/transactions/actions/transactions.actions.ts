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
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { unexpectedError, validationError } from "@/lib/action-helpers";
import { getSession } from "@/lib/auth/session";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
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

async function requireSession() {
  return getSession();
}

function revalidateTransactionPaths() {
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/budgets");
}

export async function getTransactions(filters: TransactionFilters = {}) {
  const session = await requireSession();

  if (!session) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    };
  }

  const conditions = [eq(transactions.userId, session.user.id)];

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

  // Build order by clause dynamically
  const orderByClause = [];
  if (sortBy === "description") {
    orderByClause.push(sortOrder === "asc" ? transactions.description : desc(transactions.description));
  } else if (sortBy === "categoryName") {
    orderByClause.push(sortOrder === "asc" ? categories.name : desc(categories.name));
  } else if (sortBy === "transactionDate") {
    orderByClause.push(sortOrder === "asc" ? transactions.transactionDate : desc(transactions.transactionDate));
  } else if (sortBy === "amount") {
    orderByClause.push(sortOrder === "asc" ? transactions.amount : desc(transactions.amount));
  }
  // Add secondary sort by createdAt for consistent ordering
  orderByClause.push(desc(transactions.createdAt));

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        type: transactions.type,
        transactionDate: transactions.transactionDate,
        notes: transactions.notes,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
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
    total,
    page,
    pageSize,
  };
}

export async function createTransaction(
  input: TransactionInput,
): Promise<ActionResult<{ id: string }, Extract<keyof TransactionInput, string>>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const payload = transactionSchema.parse(input);

    const [createdTransaction] = await db
      .insert(transactions)
      .values({
        userId: session.user.id,
        categoryId: payload.categoryId,
        type: payload.type,
        description: payload.description,
        amount: payload.amount,
        transactionDate: new Date(payload.transactionDate),
        notes: payload.notes || null,
      })
      .returning({ id: transactions.id });

    revalidateTransactionPaths();

    return { success: true, data: createdTransaction };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<Extract<keyof TransactionInput, string>>(error)
      : unexpectedError("Unable to create transaction.");
  }
}

export async function updateTransaction(
  transactionId: string,
  input: TransactionInput,
): Promise<ActionResult<{ id: string }, Extract<keyof TransactionInput, string>>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const payload = transactionSchema.parse(input);

    const [updatedTransaction] = await db
      .update(transactions)
      .set({
        categoryId: payload.categoryId,
        type: payload.type,
        description: payload.description,
        amount: payload.amount,
        transactionDate: new Date(payload.transactionDate),
        notes: payload.notes || null,
      })
      .where(
        and(eq(transactions.id, transactionId), eq(transactions.userId, session.user.id)),
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
      : unexpectedError("Unable to update transaction.");
  }
}

export async function deleteTransaction(
  transactionId: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  const [deletedTransaction] = await db
    .delete(transactions)
    .where(
      and(eq(transactions.id, transactionId), eq(transactions.userId, session.user.id)),
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
  const session = await requireSession();

  if (!session) {
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
          eq(transactions.userId, session.user.id),
        ),
      )
      .returning({ id: transactions.id });

    return deleted.length;
  });

  revalidateTransactionPaths();

  return { success: true, data: { count: deletedCount } };
}
