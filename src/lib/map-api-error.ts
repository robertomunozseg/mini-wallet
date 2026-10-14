import axios from "axios";
import type { ApiError, ApiErrorCode } from "@/domain/errors";

// User-facing messages. The message sent by the server is never shown as is.
const MESSAGES: Record<ApiErrorCode, string> = {
  INVALID_CREDENTIALS: "Invalid credentials. Check your details and try again.",
  VALIDATION_ERROR: "Some of the information you entered is not valid.",
  INSUFFICIENT_FUNDS: "You don't have enough balance for this transfer.",
  NETWORK_ERROR: "We couldn't reach the server. Check your connection and try again.",
  TIMEOUT: "The request took too long. Please try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  UNKNOWN_ERROR: "Something went wrong. Please try again.",
};

function toApiError(code: ApiErrorCode): ApiError {
  return { code, message: MESSAGES[code] };
}

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && Object.hasOwn(MESSAGES, value);
}

// Reads `error.code` from a response body shaped like { error: { code, message } }.
function readApiErrorCode(body: unknown): ApiErrorCode | null {
  if (typeof body !== "object" || body === null || !("error" in body)) return null;
  const { error } = body;
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  return isApiErrorCode(error.code) ? error.code : null;
}

export function mapApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) return toApiError("UNKNOWN_ERROR");

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return toApiError("TIMEOUT");
  if (error.code === axios.AxiosError.ERR_CANCELED) return toApiError("UNKNOWN_ERROR");
  if (!error.response) return toApiError("NETWORK_ERROR");

  return toApiError(readApiErrorCode(error.response.data) ?? "UNKNOWN_ERROR");
}
