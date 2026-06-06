import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized." },
    { status: 401 },
  );
}

export function forbidden(message = "Forbidden.") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

export function notFound(message = "Not found.") {
  return NextResponse.json({ success: false, error: message }, { status: 404 });
}

export function badRequest(error: string, fieldErrors?: Record<string, string[]>) {
  return NextResponse.json(
    { success: false, error, ...(fieldErrors ? { fieldErrors } : {}) },
    { status: 400 },
  );
}

export function serverError(message = "An unexpected error occurred.") {
  return NextResponse.json(
    { success: false, error: message },
    { status: 500 },
  );
}
