import { NextResponse, type NextRequest } from "next/server";

import { ACCESS_COOKIE_NAME } from "@/lib/auth/cookies";
import { env } from "@/lib/env";
import { verifyToken } from "@/lib/auth/jwt";

const protectedPaths = [
  "/dashboard",
  "/transactions",
  "/categories",
  "/budgets",
  "/recurring",
  "/reports",
  "/settings",
];

const authPaths = ["/login", "/register"];

function isProtectedPath(pathname: string) {
  return protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isAuthPath(pathname: string) {
  return authPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  let hasValidSession = false;

  if (accessToken) {
    try {
      const payload = await verifyToken<{ type: "access" }>(
        accessToken,
        env.JWT_ACCESS_SECRET,
      );

      hasValidSession = payload.type === "access";
    } catch {
      hasValidSession = false;
    }
  }

  if (isProtectedPath(pathname) && !hasValidSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath(pathname) && hasValidSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/categories/:path*",
    "/budgets/:path*",
    "/recurring/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
