import type { z } from "zod";
import type { ApiError, ApiErrorCode } from "@/domain/errors";

export function apiError(code: ApiErrorCode, message: string): ApiError {
  return { code, message };
}

// Only the first issue is reported: the UI shows one message per request.
export function validationError(error: z.ZodError): ApiError {
  return apiError("VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid request.");
}
