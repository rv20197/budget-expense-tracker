"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/db";
import { householdMembers, households } from "@/db/schema";
import { setAuthCookies } from "@/lib/auth/cookies";
import { getAuthenticatedUserId } from "@/lib/auth/getUser";
import { issueTokensForUser } from "@/lib/auth/service";
import { logger } from "@/lib/logger";

export async function joinHousehold(inviteCode: string) {
  const userId = await getAuthenticatedUserId();
  const normalizedCode = inviteCode.trim().toUpperCase();
  logger.info("HouseholdActions", `User ${userId} attempting to join household with code ${normalizedCode}`);

  const [existingMembership] = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId))
    .limit(1);

  if (existingMembership) {
    logger.warn("HouseholdActions", `User ${userId} already in a household`);
    throw new Error("You are already in a household.");
  }

  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.inviteCode, normalizedCode))
    .limit(1);

  if (!household) {
    logger.warn("HouseholdActions", `Invalid invite code provided: ${normalizedCode}`);
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

  logger.info("HouseholdActions", `User ${userId} joined household ${household.id} ("${household.name}")`);
  return household;
}
