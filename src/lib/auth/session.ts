import "server-only";

import { cookies } from "next/headers";

import { ACCESS_COOKIE_NAME } from "@/lib/auth/cookies";
import { env } from "@/lib/env";
import { verifyToken } from "@/lib/auth/jwt";

export type Session = {
  user: {
    id: string;
    email: string;
    name: string;
    householdId: string | null;
  };
};

type AccessTokenPayload = {
  sub: string;
  email: string;
  householdId?: string | null;
  name: string;
  type: "access";
};

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const payload = await verifyToken<AccessTokenPayload>(
      accessToken,
      env.JWT_ACCESS_SECRET,
    );

    if (payload.type !== "access" || !payload.sub || !payload.email) {
      return null;
    }

    return {
      user: {
        id: payload.sub,
        email: payload.email,
        householdId: payload.householdId ?? null,
        name: payload.name,
      },
    };
  } catch {
    return null;
  }
}
