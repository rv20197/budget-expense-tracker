import { and, asc, eq, or, sql } from "drizzle-orm";
import { ZodError } from "zod";

import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";
import {
  formatMonthYear,
  startOfMonth,
  toDecimal,
  toMoneyString,
} from "@/lib/utils";
import { budgetSchema } from "@/features/budgets/schemas/budget.schemas";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const { userId, householdId } = {
    userId: session.user.id,
    householdId: session.user.householdId,
  };

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1);
  const year = Number(searchParams.get("year") ?? now.getFullYear());

  const monthStart = startOfMonth(month, year);
  const monthEnd = new Date(year, month, 0);

  const rows = await db
    .select({
      budgetId: budgets.id,
      budgetAmount: budgets.amount,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryColor: categories.color,
      scope: budgets.scope,
      createdBy: budgets.createdBy,
      spentAmount:
        sql<string>`coalesce(sum(case when ${transactions.transactionDate} between ${monthStart} and ${monthEnd} then ${transactions.amount} else 0 end), 0)`,
      remainingAmount:
        sql<string>`coalesce(${budgets.amount}, 0) - coalesce(sum(case when ${transactions.transactionDate} between ${monthStart} and ${monthEnd} then ${transactions.amount} else 0 end), 0)`,
    })
    .from(budgets)
    .innerJoin(categories, eq(categories.id, budgets.categoryId))
    .leftJoin(
      transactions,
      and(
        eq(transactions.categoryId, budgets.categoryId),
        eq(transactions.householdId, householdId),
        eq(transactions.type, "expense"),
      ),
    )
    .where(
      and(
        eq(budgets.householdId, householdId),
        eq(budgets.month, month),
        eq(budgets.year, year),
        or(
          eq(budgets.scope, "household"),
          and(
            eq(budgets.scope, "personal"),
            eq(budgets.createdBy, userId),
          ),
        ),
      ),
    )
    .groupBy(budgets.id, categories.id)
    .orderBy(asc(categories.name), asc(budgets.scope));

  return ok(
    rows.map((row) => {
      const budgetAmount = toDecimal(row.budgetAmount ?? "0");
      const spentAmount = toDecimal(row.spentAmount ?? "0");
      const progress = budgetAmount.greaterThan(0)
        ? spentAmount.dividedBy(budgetAmount).mul(100).toNumber()
        : 0;

      return {
        ...row,
        budgetAmount: toMoneyString(budgetAmount),
        spentAmount: toMoneyString(spentAmount),
        remainingAmount: toMoneyString(budgetAmount.minus(spentAmount)),
        progress,
        isOverBudget:
          spentAmount.greaterThanOrEqualTo(budgetAmount) &&
          budgetAmount.greaterThan(0),
        month,
        year,
        monthLabel: formatMonthYear(month, year),
      };
    }),
  );
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const { userId, householdId } = {
    userId: session.user.id,
    householdId: session.user.householdId,
  };

  try {
    const body = await request.json();
    const { scope = "household", ...input } = body;
    const payload = budgetSchema.parse(input);

    const [existing] = await db
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

    if (existing) {
      await db
        .update(budgets)
        .set({ amount: payload.amount })
        .where(eq(budgets.id, existing.id));
      return ok({ categoryId: payload.categoryId });
    }

    await db.insert(budgets).values({
      amount: payload.amount,
      categoryId: payload.categoryId,
      createdBy: userId,
      householdId,
      month: payload.month,
      scope,
      year: payload.year,
    });

    return ok({ categoryId: payload.categoryId }, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest("Validation failed.", error.flatten().fieldErrors as Record<string, string[]>);
    }
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
