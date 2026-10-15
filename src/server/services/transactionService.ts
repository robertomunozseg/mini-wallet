import type { Scenario } from "@/domain/api";
import type { ApiError, TransferValidationError } from "@/domain/errors";
import { err, ok, type Result } from "@/domain/result";
import type { TransferRequest } from "@/domain/schemas";
import type { Receipt, Transaction } from "@/domain/types";
import { TRANSFER_ERROR_MESSAGES, validateTransfer } from "@/domain/transfer-rules";
import { apiError } from "../api-error";
import {
  addMovement,
  getBalance,
  getOutcome,
  getReceiptById,
  saveOutcome,
  saveReceipt,
} from "../mock-db";
import { sleep } from "../sleep";
import { debit } from "./accountService";

// Long enough for the client to give up first, so the UI timeout state can be exercised.
export const TIMEOUT_DELAY_MS = 10_000;

// Tests can shorten the wait with MOCK_TIMEOUT_DELAY_MS (server only) instead of waiting 10 s.
// Anything that is not a positive whole number falls back to the default.
export const timeoutDelayMs = (configured = process.env.MOCK_TIMEOUT_DELAY_MS): number => {
  const value = Number(configured);
  return Number.isInteger(value) && value > 0 ? value : TIMEOUT_DELAY_MS;
};

type Deps = {
  sleep: (ms: number) => Promise<void>;
  now: () => Date;
  newId: () => string;
};

const validationFailure = (errors: TransferValidationError[]): ApiError => {
  const message = errors.map((error) => TRANSFER_ERROR_MESSAGES[error]).join(" ");
  const code = errors.includes("INSUFFICIENT_BALANCE") ? "INSUFFICIENT_FUNDS" : "VALIDATION_ERROR";
  return apiError(code, message);
};

// The clock, the id generator and the waiting can be replaced, so tests control them.
export const createTransactionService = (overrides: Partial<Deps> = {}) => {
  const deps: Deps = {
    sleep,
    now: () => new Date(),
    newId: () => crypto.randomUUID(),
    ...overrides,
  };

  const completeTransfer = (
    transfer: { amountCents: TransferRequest["amountCents"]; recipient: string },
    idempotencyKey: string,
  ): Result<Receipt, ApiError> => {
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

    const receipt: Receipt = { transaction, newBalanceCents: debited.value };
    saveReceipt(receipt);
    const outcome = ok(receipt);
    saveOutcome(idempotencyKey, outcome, deps.now().getTime());
    return outcome;
  };

  // Saved outcomes make retries safe: the same key never debits twice.
  // Only final outcomes are saved (success, insufficient_funds). Network errors, timeouts and
  // unknown errors are not, so a retry with the same key can still succeed. Validation errors
  // are not saved either: they depend on the input, not on the key.
  const create = async (
    input: TransferRequest,
    idempotencyKey: string,
    scenario: Scenario,
  ): Promise<Result<Receipt, ApiError>> => {
    const stored = getOutcome(idempotencyKey, deps.now().getTime());
    if (stored) return stored;

    // The client runs this rule too, but the server never trusts it.
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
        await deps.sleep(timeoutDelayMs());
        return err(apiError("TIMEOUT", "The request timed out. Please try again."));
      case "unknown_error":
        return err(apiError("UNKNOWN_ERROR", "Something went wrong. Please try again."));
    }
  };

  return { create };
};

export const transactionService = createTransactionService();

// The mock has one user, so any signed-in user can open any receipt.
// With real users it would also check the owner.
export const getReceipt = (transactionId: string): Receipt | null =>
  getReceiptById(transactionId) ?? null;
