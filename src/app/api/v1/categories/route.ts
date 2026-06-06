import { and, asc, eq, or } from "drizzle-orm";
import { ZodError } from "zod";

import { db } from "@/db";
import { categories } from "@/db/schema";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";
import { categorySchema } from "@/features/transactions/schemas/finance.schemas";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const { userId, householdId } = {
    userId: session.user.id,
    householdId: session.user.householdId,
  };

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as "income" | "expense" | null;

  const rows = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.householdId, householdId),
        or(
          eq(categories.scope, "household"),
          and(
            eq(categories.scope, "personal"),
            eq(categories.createdBy, userId),
          ),
        ),
        type ? eq(categories.type, type) : undefined,
      ),
    )
    .orderBy(asc(categories.type), asc(categories.name));

  return ok(rows);
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
    const payload = categorySchema.parse(input);

    const [created] = await db
      .insert(categories)
      .values({
        color: payload.color,
        createdBy: userId,
        householdId,
        name: payload.name,
        scope,
        type: payload.type,
      })
      .returning();

    return ok(created, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest("Validation failed.", error.flatten().fieldErrors as Record<string, string[]>);
    }
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
