import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  clearAuthCookies,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
} from "@/lib/auth/cookies";
import { refreshUserSession } from "@/lib/auth/service";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

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
