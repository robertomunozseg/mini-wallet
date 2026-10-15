import type { TransferValidationError } from "./errors";
import { err, ok, type Result } from "./result";
import type { Cents, ValidTransfer } from "./types";

// One message per rule. The client shows it inline and the server sends it back.
export const TRANSFER_ERROR_MESSAGES: Record<TransferValidationError, string> = {
  AMOUNT_REQUIRED: "Enter an amount.",
  AMOUNT_NOT_POSITIVE: "The amount must be greater than zero.",
  INSUFFICIENT_BALANCE: "Insufficient balance.",
  RECIPIENT_REQUIRED: "Choose a recipient.",
};

type TransferInput = {
  amountCents: Cents | null; // null: the typed text is not an amount (see toCents)
  balanceCents: Cents;
  recipient: string;
};

// The three transfer rules. The client runs it for quick feedback and the server runs it again
// as the source of truth. It returns every error it finds, not only the first.
export const validateTransfer = (
  input: TransferInput,
): Result<ValidTransfer, TransferValidationError[]> => {
  const { amountCents, balanceCents } = input;
  const recipient = input.recipient.trim();
  const errors: TransferValidationError[] = [];

  if (amountCents === null) {
    errors.push("AMOUNT_REQUIRED");
  } else if (amountCents <= 0) {
    errors.push("AMOUNT_NOT_POSITIVE");
  } else if (amountCents > balanceCents) {
    errors.push("INSUFFICIENT_BALANCE");
  }

  if (recipient === "") {
    errors.push("RECIPIENT_REQUIRED");
  }

  if (errors.length > 0 || amountCents === null) {
    return err(errors);
  }
  return ok({ amountCents, recipient });
};
