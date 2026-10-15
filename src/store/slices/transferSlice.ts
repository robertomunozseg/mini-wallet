import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Scenario } from "@/domain/api";
import { validateTransfer } from "@/domain/transfer-rules";
import type { Cents } from "@/domain/types";

// How the request is going (processing, error, success) lives in useConfirmTransfer. The store
// only keeps what has to survive between steps.
export type TransferStep = "amount" | "recipient" | "summary" | "confirming";

// Demo mode only: "random" lets the server choose; any other value forces that scenario.
export type DemoScenario = Scenario | "random";

export type TransferState = {
  step: TransferStep;
  amountCents: Cents | null;
  recipient: string;
  idempotencyKey: string | null;
  demoScenario: DemoScenario;
};

type StateWithTransfer = { transfer: TransferState };

const initialState: TransferState = {
  step: "amount",
  amountCents: null,
  recipient: "",
  idempotencyKey: null,
  demoScenario: "random",
};

const transferSlice = createSlice({
  name: "transfer",
  initialState,
  reducers: {
    // Changing the draft is a new transfer, so the old idempotency key is dropped.
    setAmount(state, action: PayloadAction<Cents | null>) {
      state.amountCents = action.payload;
      state.idempotencyKey = null;
    },
    setRecipient(state, action: PayloadAction<string>) {
      state.recipient = action.payload;
      state.idempotencyKey = null;
    },
    goToStep(state, action: PayloadAction<TransferStep>) {
      state.step = action.payload;
    },
    // A reducer must be pure, so the random key is made in `prepare`.
    // If a key already exists it is kept: a retry of the same transfer reuses it.
    startConfirm: {
      reducer(state, action: PayloadAction<string>) {
        state.idempotencyKey ??= action.payload;
        state.step = "confirming";
      },
      prepare() {
        return { payload: crypto.randomUUID() };
      },
    },
    // "Change amount" after a failed transfer: a new transfer, so a new key.
    editAmount(state) {
      state.step = "amount";
      state.idempotencyKey = null;
    },
    // The server would replay the saved result for the same key, so a new scenario needs a new key.
    setDemoScenario(state, action: PayloadAction<DemoScenario>) {
      state.demoScenario = action.payload;
      state.idempotencyKey = null;
    },
    reset() {
      return initialState;
    },
  },
});

export const {
  setAmount,
  setRecipient,
  goToStep,
  startConfirm,
  editAmount,
  setDemoScenario,
  reset,
} = transferSlice.actions;
export default transferSlice.reducer;

export const selectTransferStep = (state: StateWithTransfer) => state.transfer.step;
export const selectAmountCents = (state: StateWithTransfer) => state.transfer.amountCents;
export const selectRecipient = (state: StateWithTransfer) => state.transfer.recipient;
export const selectDemoScenario = (state: StateWithTransfer) => state.transfer.demoScenario;

// The balance comes from the server (it is not in Redux), so it goes in as a second argument:
// selectTransferValidation(state, balanceCents).
export const selectTransferValidation = createSelector(
  [
    selectAmountCents,
    selectRecipient,
    (_state: StateWithTransfer, balanceCents: Cents) => balanceCents,
  ],
  (amountCents, recipient, balanceCents) =>
    validateTransfer({ amountCents, balanceCents, recipient }),
);
