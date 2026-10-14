export type ApiErrorCode =
  | "INVALID_CREDENTIALS"
  | "VALIDATION_ERROR"
  | "INSUFFICIENT_FUNDS"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNAUTHORIZED"
  | "UNKNOWN_ERROR";

export type TransferValidationError =
  "AMOUNT_REQUIRED" | "AMOUNT_NOT_POSITIVE" | "INSUFFICIENT_BALANCE" | "RECIPIENT_REQUIRED";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
};

export type ApiErrorBody = {
  error: ApiError;
};
