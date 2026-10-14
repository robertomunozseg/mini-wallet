import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiError } from "@/domain/errors";
import { asCents } from "@/domain/money";
import type { Receipt } from "@/domain/types";
import reducer, {
  confirmFailed,
  confirmSucceeded,
  goToStep,
  reset,
  selectIdempotencyKey,
  selectLastResult,
  selectRecipient,
  selectTransferDraft,
  selectTransferStep,
  selectTransferValidation,
  setAmount,
  setRecipient,
  startConfirm,
  type TransferState,
} from "../slices/transferSlice";
import { makeStore } from "../store";

const initial = reducer(undefined, { type: "@@init" });

const receipt: Receipt = {
  transaction: {
    id: "tx-1",
    amountCents: asCents(5_000),
    recipient: "Ana",
    createdAt: "2026-10-14T12:00:00.000Z",
    status: "completed",
  },
  newBalanceCents: asCents(95_000),
};
const apiError: ApiError = { code: "TIMEOUT", message: "The request took too long." };

function withState(overrides: Partial<TransferState>): TransferState {
  return { ...initial, ...overrides };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("transferSlice reducer", () => {
  it("starts at the amount step with an empty draft", () => {
    expect(initial).toEqual({
      step: "amount",
      amountCents: null,
      recipient: "",
      idempotencyKey: null,
      lastResult: null,
    });
  });

  it("setAmount and setRecipient update the draft", () => {
    let state = reducer(initial, setAmount(asCents(5_000)));
    state = reducer(state, setRecipient("Ana"));
    expect(state).toMatchObject({ amountCents: 5_000, recipient: "Ana" });
  });

  it("setAmount accepts null for an invalid amount", () => {
    const state = reducer(withState({ amountCents: asCents(5_000) }), setAmount(null));
    expect(state.amountCents).toBeNull();
  });

  it.each([
    ["setAmount", setAmount(asCents(1_000))],
    ["setRecipient", setRecipient("Luis")],
  ])("%s invalidates the idempotency key", (_name, action) => {
    const state = reducer(withState({ idempotencyKey: "key-1" }), action);
    expect(state.idempotencyKey).toBeNull();
  });

  it("goToStep changes the step", () => {
    expect(reducer(initial, goToStep("summary")).step).toBe("summary");
  });

  describe("startConfirm", () => {
    it("generates an idempotency key and moves to confirming", () => {
      vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-0000-0000-000000000001");
      const state = reducer(initial, startConfirm());
      expect(state.step).toBe("confirming");
      expect(state.idempotencyKey).toBe("00000000-0000-0000-0000-000000000001");
    });

    it("keeps the existing key on a retry", () => {
      vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-0000-0000-000000000002");
      const state = reducer(withState({ idempotencyKey: "key-1" }), startConfirm());
      expect(state.idempotencyKey).toBe("key-1");
    });

    it("clears the previous result", () => {
      const state = reducer(
        withState({ lastResult: { status: "error", error: apiError } }),
        startConfirm(),
      );
      expect(state.lastResult).toBeNull();
    });

    it("generates the key in prepare, not in the reducer", () => {
      const spy = vi.spyOn(crypto, "randomUUID");
      const action = startConfirm();
      expect(spy).toHaveBeenCalledTimes(1);
      reducer(initial, action);
      reducer(initial, action);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  it("confirmSucceeded stores the receipt and moves to result", () => {
    const state = reducer(withState({ step: "confirming" }), confirmSucceeded(receipt));
    expect(state.step).toBe("result");
    expect(state.lastResult).toEqual({ status: "success", receipt });
  });

  it("confirmFailed stores the error, moves to result and keeps the key", () => {
    const state = reducer(
      withState({ step: "confirming", idempotencyKey: "key-1" }),
      confirmFailed(apiError),
    );
    expect(state.step).toBe("result");
    expect(state.lastResult).toEqual({ status: "error", error: apiError });
    expect(state.idempotencyKey).toBe("key-1");
  });

  it("reset returns to the initial state", () => {
    const dirty = withState({
      step: "result",
      amountCents: asCents(5_000),
      recipient: "Ana",
      idempotencyKey: "key-1",
      lastResult: { status: "success", receipt },
    });
    expect(reducer(dirty, reset())).toEqual(initial);
  });
});

describe("transferSlice selectors", () => {
  it("read each field from the store", () => {
    const store = makeStore();
    store.dispatch(setAmount(asCents(5_000)));
    store.dispatch(setRecipient("Ana"));
    store.dispatch(goToStep("summary"));

    const state = store.getState();
    expect(selectTransferStep(state)).toBe("summary");
    expect(selectRecipient(state)).toBe("Ana");
    expect(selectIdempotencyKey(state)).toBeNull();
    expect(selectLastResult(state)).toBeNull();
  });

  it("selectTransferDraft returns the same reference while the draft does not change", () => {
    const store = makeStore();
    store.dispatch(setRecipient("Ana"));
    const first = selectTransferDraft(store.getState());
    expect(first).toEqual({ amountCents: null, recipient: "Ana" });

    store.dispatch(goToStep("summary")); // unrelated change
    expect(selectTransferDraft(store.getState())).toBe(first);

    store.dispatch(setAmount(asCents(100)));
    expect(selectTransferDraft(store.getState())).not.toBe(first);
  });

  describe("selectTransferValidation", () => {
    const balance = asCents(100_000);

    it("is ok for a valid draft", () => {
      const store = makeStore();
      store.dispatch(setAmount(asCents(5_000)));
      store.dispatch(setRecipient(" Ana "));
      expect(selectTransferValidation(store.getState(), balance)).toEqual({
        ok: true,
        value: { amountCents: 5_000, recipient: "Ana" },
      });
    });

    it("returns all the domain errors", () => {
      const store = makeStore();
      expect(selectTransferValidation(store.getState(), balance)).toEqual({
        ok: false,
        error: ["AMOUNT_REQUIRED", "RECIPIENT_REQUIRED"],
      });
    });

    it("depends on the balance passed in", () => {
      const store = makeStore();
      store.dispatch(setAmount(asCents(5_000)));
      store.dispatch(setRecipient("Ana"));
      const state = store.getState();

      expect(selectTransferValidation(state, asCents(5_000)).ok).toBe(true);
      expect(selectTransferValidation(state, asCents(4_999))).toEqual({
        ok: false,
        error: ["INSUFFICIENT_BALANCE"],
      });
    });

    it("is memoized: same inputs return the same result without recomputing", () => {
      const store = makeStore();
      store.dispatch(setAmount(asCents(5_000)));
      store.dispatch(setRecipient("Ana"));
      selectTransferValidation.resetRecomputations();

      const first = selectTransferValidation(store.getState(), balance);
      store.dispatch(goToStep("summary")); // unrelated change
      const second = selectTransferValidation(store.getState(), balance);

      expect(second).toBe(first);
      expect(selectTransferValidation.recomputations()).toBe(1);
    });
  });
});
