"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { householdMembers, households, users } from "@/db/schema";
import { getAuthContext } from "@/lib/auth/getUser";

export async function getHouseholdWithMembers() {
  const { householdId } = await getAuthContext();

  const [household, members] = await Promise.all([
    db.select().from(households).where(eq(households.id, householdId)).limit(1),
    db
      .select({
        email: users.email,
        id: users.id,
        joinedAt: householdMembers.joinedAt,
        name: users.name,
        role: householdMembers.role,
      })
      .from(householdMembers)
      .innerJoin(users, eq(householdMembers.userId, users.id))
      .where(eq(householdMembers.householdId, householdId)),
  ]);

  return {
    household: household[0] ?? null,
    members,
  };
}
