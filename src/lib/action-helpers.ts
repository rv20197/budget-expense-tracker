import { ZodError } from "zod";

import type { ActionResult, FieldErrors } from "@/lib/types/actions";

export function validationError<TField extends string>(
  error: ZodError,
  fallback = "Please correct the highlighted fields.",
): ActionResult<never, TField> {
  return {
    success: false,
    error: fallback,
    fieldErrors: error.flatten().fieldErrors as FieldErrors<TField>,
  };
}

export function unexpectedError<TField extends string = string>(
  fallback = "Something went wrong. Please try again.",
): ActionResult<never, TField> {
  return {
    success: false,
    error: fallback,
  };
}
