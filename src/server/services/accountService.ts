import type { ApiError } from "@/domain/errors";
import { asCents } from "@/domain/money";
import { err, ok, type Result } from "@/domain/result";
import type { Account, Cents } from "@/domain/types";
import { apiError } from "../api-error";
import { getBalance, getUser, setBalance } from "../mock-db";

export function getAccount(): Account {
  return { userId: getUser().id, balanceCents: getBalance() };
}

// Synchronous on purpose: check and update happen with no await in between, so they are atomic.
export function debit(amountCents: Cents): Result<Cents, ApiError> {
  const balanceCents = getBalance();
  if (amountCents > balanceCents) {
    return err(apiError("INSUFFICIENT_FUNDS", "Insufficient balance."));
  }
  const newBalanceCents = asCents(balanceCents - amountCents);
  setBalance(newBalanceCents);
  return ok(newBalanceCents);
}
