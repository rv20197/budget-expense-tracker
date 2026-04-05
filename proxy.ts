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
const onboardingPath = "/onboarding";

function isProtectedPath(pathname: string) {
  return protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isAuthPath(pathname: string) {
  return authPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isOnboardingPath(pathname: string) {
  return pathname === onboardingPath || pathname.startsWith(`${onboardingPath}/`);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  let hasValidSession = false;
  let householdId: string | null = null;

  if (accessToken) {
    try {
      const payload = await verifyToken<{ householdId?: string | null; type: "access" }>(
        accessToken,
        env.JWT_ACCESS_SECRET,
      );

      hasValidSession = payload.type === "access";
      householdId = payload.householdId ?? null;
    } catch {
      hasValidSession = false;
    }
  }

  if (isProtectedPath(pathname) && !hasValidSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasValidSession && isProtectedPath(pathname) && !householdId) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (isOnboardingPath(pathname) && !hasValidSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isOnboardingPath(pathname) && householdId) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isAuthPath(pathname) && hasValidSession) {
    return NextResponse.redirect(
      new URL(householdId ? "/dashboard" : "/onboarding", request.url),
    );
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
    "/onboarding/:path*",
    "/login",
    "/register",
  ],
};
