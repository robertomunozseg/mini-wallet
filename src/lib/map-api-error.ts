import axios from "axios";
import type { ApiError, ApiErrorCode } from "@/domain/errors";

// The text the user sees for each code. The server's own message is only used for
// VALIDATION_ERROR (see mapApiError).
const MESSAGES: Record<ApiErrorCode, string> = {
  INVALID_CREDENTIALS: "Invalid credentials. Check your details and try again.",
  VALIDATION_ERROR: "Some of the information you entered is not valid.",
  INSUFFICIENT_FUNDS: "You don't have enough balance for this transfer.",
  NETWORK_ERROR: "We couldn't reach the server. Check your connection and try again.",
  TIMEOUT: "The request took too long. Please try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  UNKNOWN_ERROR: "Something went wrong. Please try again.",
};

const toApiError = (code: ApiErrorCode): ApiError => ({ code, message: MESSAGES[code] });

const isApiErrorCode = (value: unknown): value is ApiErrorCode =>
  typeof value === "string" && Object.hasOwn(MESSAGES, value);

type ReadError = { code: ApiErrorCode; message: unknown };

// Reads { error: { code, message } } from a response body, or null if it does not look like that.
const readApiError = (body: unknown): ReadError | null => {
  if (typeof body !== "object" || body === null || !("error" in body)) return null;
  const { error } = body;
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  if (!isApiErrorCode(error.code)) return null;
  return { code: error.code, message: "message" in error ? error.message : undefined };
};

// Turns anything that can go wrong with a request into an ApiError the UI can show.
export const mapApiError = (error: unknown): ApiError => {
  if (!axios.isAxiosError(error)) return toApiError("UNKNOWN_ERROR");

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return toApiError("TIMEOUT");
  if (error.code === axios.AxiosError.ERR_CANCELED) return toApiError("UNKNOWN_ERROR");
  if (!error.response) return toApiError("NETWORK_ERROR");

  const apiError = readApiError(error.response.data);
  if (!apiError) return toApiError("UNKNOWN_ERROR");

  // Our API writes its validation messages for the user (for example "A contact with this
  // phone or email already exists."), so they say more than the generic text.
  if (
    apiError.code === "VALIDATION_ERROR" &&
    typeof apiError.message === "string" &&
    apiError.message.trim() !== ""
  ) {
    return { code: apiError.code, message: apiError.message };
  }
  return toApiError(apiError.code);
};
