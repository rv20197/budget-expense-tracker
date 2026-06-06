import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";

import { db } from "@/db";
import { categories } from "@/db/schema";
import {
  badRequest,
  forbidden,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";
import { categorySchema } from "@/features/transactions/schemas/finance.schemas";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const { id } = await params;
  const { userId, householdId } = {
    userId: session.user.id,
    householdId: session.user.householdId,
  };

  const [existing] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.householdId, householdId)))
    .limit(1);

  if (!existing) return notFound("Category not found.");
  if (existing.scope === "personal" && existing.createdBy !== userId) {
    return forbidden("Cannot edit another member's personal category.");
  }

  try {
    const body = await request.json();
    const payload = categorySchema.parse(body);

    const [updated] = await db
      .update(categories)
      .set({ color: payload.color, name: payload.name, type: payload.type })
      .where(eq(categories.id, id))
      .returning();

    return ok(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest("Validation failed.", error.flatten().fieldErrors as Record<string, string[]>);
    }
    return serverError(error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const { id } = await params;
  const { userId, householdId } = {
    userId: session.user.id,
    householdId: session.user.householdId,
  };

  const [existing] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.householdId, householdId)))
    .limit(1);

  if (!existing) return notFound("Category not found.");
  if (existing.scope === "personal" && existing.createdBy !== userId) {
    return forbidden("Cannot delete another member's personal category.");
  }

  const [deleted] = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning({ id: categories.id });

  return ok(deleted);
}
