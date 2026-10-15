import type { ApiError } from "@/domain/errors";
import { asCents } from "@/domain/money";
import { err, ok, type Result } from "@/domain/result";
import type { Account, Cents } from "@/domain/types";
import { apiError } from "../api-error";
import { getBalance, getUser, setBalance } from "../mock-db";

export const getAccount = (): Account => ({ userId: getUser().id, balanceCents: getBalance() });

// No await between the check and the update, so two transfers can never spend the same money.
export const debit = (amountCents: Cents): Result<Cents, ApiError> => {
  const balanceCents = getBalance();
  if (amountCents > balanceCents) {
    return err(apiError("INSUFFICIENT_FUNDS", "Insufficient balance."));
  }
  const newBalanceCents = asCents(balanceCents - amountCents);
  setBalance(newBalanceCents);
  return ok(newBalanceCents);
};
