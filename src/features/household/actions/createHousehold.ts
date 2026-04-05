"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";

import { db } from "@/db";
import { categories, householdMembers, households } from "@/db/schema";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { getAuthenticatedUserId } from "@/lib/auth/getUser";
import { issueTokensForUser } from "@/lib/auth/service";
import { setAuthCookies } from "@/lib/auth/cookies";

async function generateInviteCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = nanoid(8).toUpperCase();
    const [existing] = await db
      .select({ id: households.id })
      .from(households)
      .where(eq(households.inviteCode, inviteCode))
      .limit(1);

    if (!existing) {
      return inviteCode;
    }
  }

  throw new Error("Unable to generate a unique invite code.");
}

export async function createHousehold(name: string) {
  const userId = await getAuthenticatedUserId();
  const inviteCode = await generateInviteCode();

  const [existingMembership] = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId))
    .limit(1);

  if (existingMembership) {
    throw new Error("You are already in a household.");
  }

  const household = await db.transaction(async (tx) => {
    const [createdHousehold] = await tx
      .insert(households)
      .values({ name: name.trim(), inviteCode })
      .returning();

    await tx.insert(householdMembers).values({
      householdId: createdHousehold.id,
      role: "admin",
      userId,
    });

    await tx.insert(categories).values(
      DEFAULT_CATEGORIES.map((category) => ({
        householdId: createdHousehold.id,
        createdBy: userId,
        scope: "household" as const,
        name: category.name,
        type: category.type,
        color: category.color,
        isDefault: true,
      })),
    );

    return createdHousehold;
  });

  const tokens = await issueTokensForUser(userId);
  const cookieStore = await cookies();
  setAuthCookies(
    cookieStore,
    tokens.accessToken,
    tokens.refreshToken,
    tokens.accessExpiresAt,
    tokens.refreshExpiresAt,
  );

  return household;
}
