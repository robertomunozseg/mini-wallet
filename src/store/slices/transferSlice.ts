import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ApiError } from "@/domain/errors";
import { validateTransfer } from "@/domain/transfer-rules";
import type { Cents, Receipt, TransferDraft } from "@/domain/types";

export type TransferStep = "amount" | "recipient" | "summary" | "confirming" | "result";

export type TransferResult =
  { status: "success"; receipt: Receipt } | { status: "error"; error: ApiError };

export type TransferState = {
  step: TransferStep;
  amountCents: Cents | null;
  recipient: string;
  idempotencyKey: string | null;
  lastResult: TransferResult | null;
};

type StateWithTransfer = { transfer: TransferState };

const initialState: TransferState = {
  step: "amount",
  amountCents: null,
  recipient: "",
  idempotencyKey: null,
  lastResult: null,
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
        state.lastResult = null;
        state.step = "confirming";
      },
      prepare() {
        return { payload: crypto.randomUUID() };
      },
    },
    confirmSucceeded(state, action: PayloadAction<Receipt>) {
      state.lastResult = { status: "success", receipt: action.payload };
      state.step = "result";
    },
    confirmFailed(state, action: PayloadAction<ApiError>) {
      state.lastResult = { status: "error", error: action.payload };
      state.step = "result";
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
  confirmSucceeded,
  confirmFailed,
  reset,
} = transferSlice.actions;
export default transferSlice.reducer;

export const selectTransferStep = (state: StateWithTransfer) => state.transfer.step;
export const selectAmountCents = (state: StateWithTransfer) => state.transfer.amountCents;
export const selectRecipient = (state: StateWithTransfer) => state.transfer.recipient;
export const selectIdempotencyKey = (state: StateWithTransfer) => state.transfer.idempotencyKey;
export const selectLastResult = (state: StateWithTransfer) => state.transfer.lastResult;

export const selectTransferDraft = createSelector(
  [selectAmountCents, selectRecipient],
  (amountCents, recipient): TransferDraft => ({ amountCents, recipient }),
);

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
