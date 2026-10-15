import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Scenario } from "@/domain/api";
import { validateTransfer } from "@/domain/transfer-rules";
import type { Cents } from "@/domain/types";

// The request itself (processing, error, success) lives in useConfirmTransfer: the store only
// keeps what must survive between steps.
export type TransferStep = "amount" | "recipient" | "summary" | "confirming";

// Demo mode only: "random" lets the server pick a scenario, any other value forces it.
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
    // Changing the draft is a new intent, so the previous idempotency key must not be reused.
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
    // Reducers must be pure, so the random key is generated in `prepare`.
    // An existing key is kept: a retry of the same transfer reuses it.
    startConfirm: {
      reducer(state, action: PayloadAction<string>) {
        state.idempotencyKey ??= action.payload;
        state.step = "confirming";
      },
      prepare() {
        return { payload: crypto.randomUUID() };
      },
    },
    // "Change amount" after a failed transfer: it is a new intent, so it needs a new key.
    editAmount(state) {
      state.step = "amount";
      state.idempotencyKey = null;
    },
    // A stored outcome would be replayed for the same key, so another scenario needs a new key.
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

// The balance is server data (not in Redux), so it is passed as the second argument:
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
