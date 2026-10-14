import { NextResponse } from "next/server";
import type { z } from "zod";
import type { ApiError, ApiErrorBody, ApiErrorCode } from "@/domain/errors";
import { apiError, validationError } from "./api-error";

// Single place that maps an error code to its HTTP status.
const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  INVALID_CREDENTIALS: 401,
  UNAUTHORIZED: 401,
  INSUFFICIENT_FUNDS: 422,
  UNKNOWN_ERROR: 500,
  NETWORK_ERROR: 503,
  TIMEOUT: 504,
};

// The API returns data of one user, so no shared cache (CDN, proxy) may store it. "private" also
// lets the browser keep it, but "no-store" tells it to always ask again: balances and lists
// must never be shown stale.
const NO_STORE = { "Cache-Control": "private, no-store" };

export function jsonOk<T>(body: T, status = 200): NextResponse<T> {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export function jsonError(error: ApiError): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error }, { status: STATUS_BY_CODE[error.code], headers: NO_STORE });
}

export function unauthorizedResponse(): NextResponse<ApiErrorBody> {
  return jsonError(apiError("UNAUTHORIZED", "You must sign in to continue."));
}

export function validationErrorResponse(error: z.ZodError): NextResponse<ApiErrorBody> {
  return jsonError(validationError(error));
}

// Returns null when the body is missing or is not valid JSON; the schema then rejects it.
export async function readJsonBody(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}
