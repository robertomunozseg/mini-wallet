import { afterEach, describe, expect, it, vi } from "vitest";
import { asCents } from "@/domain/money";
import reducer, {
  editAmount,
  goToStep,
  reset,
  selectDemoScenario,
  selectRecipient,
  selectTransferStep,
  selectTransferValidation,
  setAmount,
  setDemoScenario,
  setRecipient,
  startConfirm,
  type TransferState,
} from "../slices/transferSlice";
import { makeStore } from "../store";

const initial = reducer(undefined, { type: "@@init" });

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
      demoScenario: "random",
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

    it("generates the key in prepare, not in the reducer", () => {
      const spy = vi.spyOn(crypto, "randomUUID");
      const action = startConfirm();
      expect(spy).toHaveBeenCalledTimes(1);
      reducer(initial, action);
      reducer(initial, action);
      expect(spy).toHaveBeenCalledTimes(1);
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

  describe("setDemoScenario", () => {
    it("stores the scenario and invalidates the key, so the new scenario is not replayed", () => {
      const state = reducer(withState({ idempotencyKey: "key-1" }), setDemoScenario("timeout"));
      expect(state.demoScenario).toBe("timeout");
      expect(state.idempotencyKey).toBeNull();
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
  it("read each field from the store", () => {
    const store = makeStore();
    store.dispatch(setAmount(asCents(5_000)));
    store.dispatch(setRecipient("Ana"));
    store.dispatch(goToStep("summary"));

    const state = store.getState();
    expect(selectTransferStep(state)).toBe("summary");
    expect(selectRecipient(state)).toBe("Ana");
    expect(selectDemoScenario(state)).toBe("random");
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
