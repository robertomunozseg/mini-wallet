import type { z } from "zod";
import type { ApiError, ApiErrorCode } from "@/domain/errors";

export const apiError = (code: ApiErrorCode, message: string): ApiError => ({ code, message });

// Only the first issue: the UI shows one message per request.
export const validationError = (error: z.ZodError): ApiError =>
  apiError("VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid request.");
