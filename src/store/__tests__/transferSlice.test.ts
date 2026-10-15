import { afterEach, describe, expect, it, vi } from "vitest";
import { asCents } from "@/domain/money";
import reducer, {
  editAmount,
  reset,
  selectTransferValidation,
  setAmount,
  setRecipient,
  startConfirm,
  type TransferState,
} from "../slices/transferSlice";
import { makeStore } from "../store";

const initial = reducer(undefined, { type: "@@init" });

const withState = (overrides: Partial<TransferState>): TransferState => {
  return { ...initial, ...overrides };
};
afterEach(() => {
  vi.restoreAllMocks();
});

describe("transferSlice reducer", () => {
  it.each([
    ["setAmount", setAmount(asCents(1_000))],
    ["setRecipient", setRecipient("Luis")],
  ])("%s invalidates the idempotency key", (_name, action) => {
    const state = reducer(withState({ idempotencyKey: "key-1" }), action);
    expect(state.idempotencyKey).toBeNull();
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
  });

  describe("editAmount", () => {
    it("goes back to the amount step and invalidates the idempotency key", () => {
      const state = reducer(
        withState({ step: "confirming", idempotencyKey: "key-1", amountCents: asCents(5_000) }),
        editAmount(),
      );
      expect(state.step).toBe("amount");
      expect(state.idempotencyKey).toBeNull();
      expect(state.amountCents).toBe(5_000);
    });
  });

  it("reset returns to the initial state", () => {
    const dirty = withState({
      step: "confirming",
      amountCents: asCents(5_000),
      recipient: "Ana",
      idempotencyKey: "key-1",
      demoScenario: "timeout",
    });
    expect(reducer(dirty, reset())).toEqual(initial);
  });
});

describe("transferSlice selectors", () => {
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
  });
});
