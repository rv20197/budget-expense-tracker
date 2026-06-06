import { eq } from "drizzle-orm";
import { ZodError } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";
import {
  comparePassword,
  hashPassword,
} from "@/lib/auth/password";
import { revokeAllUserRefreshTokens } from "@/lib/auth/service";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) return unauthorized();

  return ok({ ...user, householdId: session.user.householdId });
}

export async function PATCH(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "changePassword") {
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) {
        return badRequest("currentPassword and newPassword are required.");
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      if (!user) return unauthorized();

      const valid = await comparePassword(currentPassword, user.passwordHash);
      if (!valid) {
        return badRequest("Current password is incorrect.", {
          currentPassword: ["Current password is incorrect."],
        });
      }

      const newHash = await hashPassword(newPassword);
      await db
        .update(users)
        .set({ passwordHash: newHash })
        .where(eq(users.id, user.id));

      await revokeAllUserRefreshTokens(user.id);

      return ok({ message: "Password changed. Please log in again." });
    }

    // Update name/email
    const updates: Record<string, string> = {};
    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (typeof body.email === "string" && body.email.trim()) {
      updates.email = body.email.trim().toLowerCase();
    }

    if (Object.keys(updates).length === 0) {
      return badRequest("No valid fields to update.");
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, session.user.id))
      .returning({ id: users.id, name: users.name, email: users.email });

    return ok(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return badRequest("Validation failed.", error.flatten().fieldErrors as Record<string, string[]>);
    }
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
