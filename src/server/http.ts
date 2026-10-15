import { NextResponse } from "next/server";
import type { z } from "zod";
import type { ApiError, ApiErrorBody, ApiErrorCode } from "@/domain/errors";
import { apiError, validationError } from "./api-error";

// The one place that says which HTTP status each error code has.
const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  INVALID_CREDENTIALS: 401,
  UNAUTHORIZED: 401,
  INSUFFICIENT_FUNDS: 422,
  UNKNOWN_ERROR: 500,
  NETWORK_ERROR: 503,
  TIMEOUT: 504,
};

// These are one user's data, so no shared cache (CDN, proxy) may keep them. "no-store" also
// makes the browser ask again, so a balance or a list is never shown stale.
const NO_STORE = { "Cache-Control": "private, no-store" };

export const jsonOk = <T>(body: T, status = 200): NextResponse<T> =>
  NextResponse.json(body, { status, headers: NO_STORE });

export const jsonError = (error: ApiError): NextResponse<ApiErrorBody> =>
  NextResponse.json({ error }, { status: STATUS_BY_CODE[error.code], headers: NO_STORE });

export const unauthorizedResponse = (): NextResponse<ApiErrorBody> =>
  jsonError(apiError("UNAUTHORIZED", "You must sign in to continue."));

export const validationErrorResponse = (error: z.ZodError): NextResponse<ApiErrorBody> =>
  jsonError(validationError(error));

// null when the body is empty or not JSON; the schema then rejects it.
export const readJsonBody = (request: Request): Promise<unknown> =>
  request.json().catch(() => null);
