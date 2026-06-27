import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  clearAuthCookies,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
} from "@/lib/auth/cookies";
import { refreshUserSession } from "@/lib/auth/service";

export async function POST(request: Request) {
  // Mobile clients send the refresh token in the JSON body; web clients rely
  // on the httpOnly cookie. Accept both so a single endpoint serves both.
  let refreshToken: string | undefined;

  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      const body = await request.json();
      refreshToken = typeof body?.refreshToken === "string"
        ? body.refreshToken
        : undefined;
    } catch {
      // Malformed body — fall through to cookie below.
    }
  }

  if (!refreshToken) {
    const cookieStore = await cookies();
    refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
  }

  if (!refreshToken) {
    const response = NextResponse.json(
      { success: false, error: "Refresh token missing." },
      { status: 401 },
    );

    clearAuthCookies(response.cookies);

    return response;
  }

  try {
    const result = await refreshUserSession(refreshToken);
    const response = NextResponse.json({
      success: true,
      data: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        // Returned for mobile Bearer-token clients.
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      },
    });

    setAuthCookies(
      response.cookies,
      result.tokens.accessToken,
      result.tokens.refreshToken,
      result.tokens.accessExpiresAt,
      result.tokens.refreshExpiresAt,
    );

    return response;
  } catch {
    const response = NextResponse.json(
      { success: false, error: "Session refresh failed." },
      { status: 401 },
    );

    clearAuthCookies(response.cookies);

    return response;
  }
}
