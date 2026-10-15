"use client";

import useAxios from "axios-hooks";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SCENARIO_HEADER, type TransactionResponse } from "@/domain/api";
import type { ApiError, ApiErrorBody } from "@/domain/errors";
import type { TransferRequest } from "@/domain/schemas";
import { mapApiError } from "@/lib/map-api-error";
import { useAppDispatch, useAppStore } from "@/store/hooks";
import { startConfirm } from "@/store/slices/transferSlice";

// After this long without an answer the UI tells the user it is slower than usual.
export const SLOW_REQUEST_MS = 3000;

export type ConfirmState =
  | { status: "idle" }
  | { status: "processing"; slow: boolean }
  | { status: "success" }
  | { status: "error"; error: ApiError };

// Same as ConfirmState; "slow" is added when the state is exposed.
type Phase =
  | { status: "idle" }
  | { status: "processing" }
  | { status: "success" }
  | { status: "error"; error: ApiError };

type UseConfirmTransferResult = {
  state: ConfirmState;
  confirm: () => Promise<void>;
  retry: () => Promise<void>;
  // Back to idle, for when the user leaves the flow and starts a new transfer.
  reset: () => void;
};

// Sends POST /transactions for the transfer draft. The Idempotency-Key lives in the store, so
// every retry of the same transfer sends the same key and the server never debits twice.
export function useConfirmTransfer(): UseConfirmTransferResult {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const [, execute] = useAxios<TransactionResponse, TransferRequest, ApiErrorBody>(
    { url: "/transactions", method: "POST" },
    { manual: true, useCache: false },
  );
  const [phase, setPhase] = useState<Phase>({ status: "idle" });
  const [slow, setSlow] = useState(false);
  // `loading` updates on the next render, so a fast double click needs this ref to be blocked.
  const inFlight = useRef(false);

  const processing = phase.status === "processing";
  useEffect(() => {
    if (!processing) return;
    const timer = setTimeout(() => setSlow(true), SLOW_REQUEST_MS);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [processing]);

  // Reads the draft from the store at call time, so it also works right after startConfirm.
  const send = useCallback(async () => {
    const { amountCents, recipient, idempotencyKey, demoScenario } = store.getState().transfer;
    if (inFlight.current || amountCents === null || idempotencyKey === null) return;

    inFlight.current = true;
    setPhase({ status: "processing" });
    try {
      const response = await execute({
        data: { amountCents, recipient },
        headers: {
          "Idempotency-Key": idempotencyKey,
          ...(demoScenario === "random" ? {} : { [SCENARIO_HEADER]: demoScenario }),
        },
      });
      setPhase({ status: "success" });
      router.push(`/transfer/receipt/${response.data.receipt.transaction.id}`);
      // Home reads the balance and movements on the server: ask for fresh ones.
      router.refresh();
    } catch (error) {
      setPhase({ status: "error", error: mapApiError(error) });
    } finally {
      inFlight.current = false;
    }
  }, [store, execute, router]);

  const confirm = useCallback(async () => {
    // Creates the key, or keeps the existing one if this transfer was already attempted.
    dispatch(startConfirm());
    await send();
  }, [dispatch, send]);

  const state: ConfirmState =
    phase.status === "processing" ? { status: "processing", slow } : phase;

  const reset = useCallback(() => {
    setPhase({ status: "idle" });
  }, []);

  return { state, confirm, retry: send, reset };
}
