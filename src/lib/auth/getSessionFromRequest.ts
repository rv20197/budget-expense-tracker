import { cookies } from "next/headers";

import { ACCESS_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifyToken } from "@/lib/auth/jwt";
import { env } from "@/lib/env";

type AccessTokenPayload = {
  sub: string;
  email: string;
  householdId?: string | null;
  name: string;
  type: "access";
};

export type RequestSession = {
  user: {
    id: string;
    email: string;
    name: string;
    householdId: string | null;
  };
};

async function verifyAccessToken(token: string): Promise<RequestSession | null> {
  try {
    const payload = await verifyToken<AccessTokenPayload>(
      token,
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

export async function getSessionFromRequest(
  request: Request,
): Promise<RequestSession | null> {
  // 1. Prefer Bearer token (mobile clients)
  const authHeader = request.headers.get("Authorization");
  const bearerToken =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (bearerToken) {
    return verifyAccessToken(bearerToken);
  }

  // 2. Fall back to httpOnly cookie (same-origin browser fetch)
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value ?? null;

  if (cookieToken) {
    return verifyAccessToken(cookieToken);
  }

  return null;
}
