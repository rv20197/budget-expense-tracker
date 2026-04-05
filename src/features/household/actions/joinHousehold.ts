"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/db";
import { householdMembers, households } from "@/db/schema";
import { setAuthCookies } from "@/lib/auth/cookies";
import { getAuthenticatedUserId } from "@/lib/auth/getUser";
import { issueTokensForUser } from "@/lib/auth/service";

export async function joinHousehold(inviteCode: string) {
  const userId = await getAuthenticatedUserId();
  const normalizedCode = inviteCode.trim().toUpperCase();

  const [existingMembership] = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId))
    .limit(1);

  if (existingMembership) {
    throw new Error("You are already in a household.");
  }

  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.inviteCode, normalizedCode))
    .limit(1);

  if (!household) {
    throw new Error("Invalid invite code.");
  }

  await db.insert(householdMembers).values({
    householdId: household.id,
    role: "member",
    userId,
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
