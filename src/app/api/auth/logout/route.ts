import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { clearAuthCookies, REFRESH_COOKIE_NAME } from "@/lib/auth/cookies";
import { logoutUser } from "@/lib/auth/service";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

  await logoutUser(refreshToken);

  const response = NextResponse.json({
    success: true,
    data: null,
  });

  clearAuthCookies(response.cookies);

  return response;
}
