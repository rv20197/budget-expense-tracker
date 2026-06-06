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

export async function getSessionFromRequest(
  request: Request,
): Promise<RequestSession | null> {
  const authHeader = request.headers.get("Authorization");
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return null;
  }

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
