import type { ApiError, TransferValidationError } from "@/domain/errors";
import { err, ok, type Result } from "@/domain/result";
import type { TransferRequest } from "@/domain/schemas";
import type { Receipt, Transaction } from "@/domain/types";
import { TRANSFER_ERROR_MESSAGES, validateTransfer } from "@/domain/transfer-rules";
import { apiError } from "../api-error";
import { addMovement, getBalance, getOutcome, saveOutcome } from "../mock-db";
import type { Scenario } from "../scenario";
import { sleep } from "../sleep";
import { debit } from "./accountService";

// Long enough for the client to give up first, so the UI timeout state can be exercised.
export const TIMEOUT_DELAY_MS = 10_000;

type Deps = {
  sleep: (ms: number) => Promise<void>;
  now: () => Date;
  newId: () => string;
};

function validationFailure(errors: TransferValidationError[]): ApiError {
  const message = errors.map((error) => TRANSFER_ERROR_MESSAGES[error]).join(" ");
  const code = errors.includes("INSUFFICIENT_BALANCE") ? "INSUFFICIENT_FUNDS" : "VALIDATION_ERROR";
  return apiError(code, message);
}

export function createTransactionService(overrides: Partial<Deps> = {}) {
  const deps: Deps = {
    sleep,
    now: () => new Date(),
    newId: () => crypto.randomUUID(),
    ...overrides,
  };

  // Stored outcomes make retries safe: the same key never debits twice.
  // Only definitive outcomes are stored (success, insufficient_funds). Transient failures
  // (network_error, timeout, unknown_error) are not, so a retry with the same key can succeed.
  // Validation errors are not stored either: they depend on the input, not on the key.
  async function create(
    input: TransferRequest,
    idempotencyKey: string,
    scenario: Scenario,
  ): Promise<Result<Receipt, ApiError>> {
    const stored = getOutcome(idempotencyKey, deps.now().getTime());
    if (stored) return stored;

    // Source of truth: the client runs the same rule, but the server never trusts it.
    const validation = validateTransfer({
      amountCents: input.amountCents,
      balanceCents: getBalance(),
      recipient: input.recipient,
    });
    if (!validation.ok) return err(validationFailure(validation.error));

    switch (scenario) {
      case "success":
        return completeTransfer(validation.value, idempotencyKey);
      case "insufficient_funds": {
        const outcome = err(apiError("INSUFFICIENT_FUNDS", "Insufficient balance."));
        saveOutcome(idempotencyKey, outcome, deps.now().getTime());
        return outcome;
      }
      case "network_error":
        return err(apiError("NETWORK_ERROR", "Network error. Please try again."));
      case "timeout":
        await deps.sleep(TIMEOUT_DELAY_MS);
        return err(apiError("TIMEOUT", "The request timed out. Please try again."));
      case "unknown_error":
        return err(apiError("UNKNOWN_ERROR", "Something went wrong. Please try again."));
    }
  }

  function completeTransfer(
    transfer: { amountCents: TransferRequest["amountCents"]; recipient: string },
    idempotencyKey: string,
  ): Result<Receipt, ApiError> {
    const debited = debit(transfer.amountCents);
    if (!debited.ok) return debited;

    const createdAt = deps.now().toISOString();
    const transaction: Transaction = {
      id: deps.newId(),
      amountCents: transfer.amountCents,
      recipient: transfer.recipient,
      createdAt,
      status: "completed",
    };
    addMovement({
      id: deps.newId(),
      type: "outgoing",
      amountCents: transfer.amountCents,
      counterpartName: transfer.recipient,
      createdAt,
      status: "completed",
    });

    const outcome = ok({ transaction, newBalanceCents: debited.value });
    saveOutcome(idempotencyKey, outcome, deps.now().getTime());
    return outcome;
  }

  return { create };
}

export const transactionService = createTransactionService();
