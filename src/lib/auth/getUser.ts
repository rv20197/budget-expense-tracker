"use server";

import { getSession } from "@/lib/auth/session";

export type AuthContext = {
  userId: string;
  householdId: string;
};

export async function getAuthenticatedUserId() {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session.user.id;
}

export async function getAuthContext(): Promise<AuthContext> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  if (!session.user.householdId) {
    throw new Error("No household. Please complete onboarding.");
  }

  return {
    userId: session.user.id,
    householdId: session.user.householdId,
  };
}
