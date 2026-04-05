"use server";

import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { unexpectedError, validationError } from "@/lib/action-helpers";
import { getSession } from "@/lib/auth/session";
import { db } from "@/db";
import { recurringTransactions } from "@/db/schema";
import type { ActionResult } from "@/lib/types/actions";
import { getDateString, toMoneyString } from "@/lib/utils";
import {
  recurringTransactionSchema,
  type RecurringTransactionInput,
} from "@/features/transactions/schemas/finance.schemas";

async function requireSession() {
  return getSession();
}

function revalidateRecurringPaths() {
  revalidatePath("/recurring");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function getRecurringTransactions() {
  const session = await requireSession();

  if (!session) {
    return { all: [], upcoming: [] };
  }

  const today = new Date();
  const upcomingLimit = new Date();
  upcomingLimit.setDate(upcomingLimit.getDate() + 30);

  const [all, upcoming] = await Promise.all([
    db
      .select()
      .from(recurringTransactions)
      .where(eq(recurringTransactions.userId, session.user.id))
      .orderBy(desc(recurringTransactions.nextDueDate), asc(recurringTransactions.description)),
    db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.userId, session.user.id),
          eq(recurringTransactions.isActive, true),
          gte(recurringTransactions.nextDueDate, today),
          lte(recurringTransactions.nextDueDate, upcomingLimit),
        ),
      )
      .orderBy(asc(recurringTransactions.nextDueDate)),
  ]);

  const mapRows = (rows: typeof all) =>
    rows.map((row) => ({
      ...row,
      amount: toMoneyString(row.amount),
      startDate: getDateString(row.startDate),
      nextDueDate: getDateString(row.nextDueDate),
    }));

  return {
    all: mapRows(all),
    upcoming: mapRows(upcoming),
  };
}

export async function createRecurringTransaction(
  input: RecurringTransactionInput,
): Promise<
  ActionResult<{ id: string }, Extract<keyof RecurringTransactionInput, string>>
> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const payload = recurringTransactionSchema.parse(input);

    const [createdItem] = await db
      .insert(recurringTransactions)
      .values({
        userId: session.user.id,
        categoryId: payload.categoryId,
        type: payload.type,
        description: payload.description,
        amount: payload.amount,
        frequency: payload.frequency,
        startDate: new Date(payload.startDate),
        nextDueDate: new Date(payload.nextDueDate),
        notes: payload.notes || null,
        isActive: payload.isActive ?? true,
      })
      .returning({ id: recurringTransactions.id });

    revalidateRecurringPaths();

    return { success: true, data: createdItem };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<Extract<keyof RecurringTransactionInput, string>>(error)
      : unexpectedError("Unable to create recurring transaction.");
  }
}

export async function updateRecurringTransaction(
  recurringId: string,
  input: RecurringTransactionInput,
): Promise<
  ActionResult<{ id: string }, Extract<keyof RecurringTransactionInput, string>>
> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const payload = recurringTransactionSchema.parse(input);

    const [updatedItem] = await db
      .update(recurringTransactions)
      .set({
        categoryId: payload.categoryId,
        type: payload.type,
        description: payload.description,
        amount: payload.amount,
        frequency: payload.frequency,
        startDate: new Date(payload.startDate),
        nextDueDate: new Date(payload.nextDueDate),
        notes: payload.notes || null,
        isActive: payload.isActive ?? true,
      })
      .where(
        and(
          eq(recurringTransactions.id, recurringId),
          eq(recurringTransactions.userId, session.user.id),
        ),
      )
      .returning({ id: recurringTransactions.id });

    if (!updatedItem) {
      return { success: false, error: "Recurring transaction not found." };
    }

    revalidateRecurringPaths();

    return { success: true, data: updatedItem };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<Extract<keyof RecurringTransactionInput, string>>(error)
      : unexpectedError("Unable to update recurring transaction.");
  }
}

export async function deleteRecurringTransaction(
  recurringId: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  const [deletedItem] = await db
    .delete(recurringTransactions)
    .where(
      and(
        eq(recurringTransactions.id, recurringId),
        eq(recurringTransactions.userId, session.user.id),
      ),
    )
    .returning({ id: recurringTransactions.id });

  if (!deletedItem) {
    return { success: false, error: "Recurring transaction not found." };
  }

  revalidateRecurringPaths();

  return { success: true, data: deletedItem };
}
