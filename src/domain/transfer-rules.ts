import type { TransferValidationError } from "./errors";
import { err, ok, type Result } from "./result";
import type { Cents, ValidTransfer } from "./types";

type TransferInput = {
  // null means the typed text could not be parsed as an amount (see toCents).
  amountCents: Cents | null;
  balanceCents: Cents;
  recipient: string;
};

// Runs on the client (UX) and on the server (source of truth). Returns ALL errors found.
export function validateTransfer(
  input: TransferInput,
): Result<ValidTransfer, TransferValidationError[]> {
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
}
