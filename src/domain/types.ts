// Money is always an integer number of cents. The brand prevents mixing it with plain numbers.
export type Cents = number & { readonly __brand: "Cents" };

export type User = {
  id: string;
  name: string;
  email: string;
};

export type Account = {
  userId: string;
  balanceCents: Cents;
};

export type MovementType = "incoming" | "outgoing";
export type MovementStatus = "completed" | "pending" | "failed";

export type Movement = {
  id: string;
  type: MovementType;
  amountCents: Cents;
  counterpartName: string;
  createdAt: string; // ISO 8601
  status: MovementStatus;
};

export type Contact = {
  id: string;
  name: string;
  phoneOrEmail: string;
  isFavorite: boolean;
};

// Transfer form state kept in the UI. amountCents is null while the typed text is not a valid amount.
export type TransferDraft = {
  recipient: string;
  amountCents: Cents | null;
};

export type TransactionStatus = "completed" | "failed";

export type Transaction = {
  id: string;
  amountCents: Cents;
  recipient: string;
  createdAt: string; // ISO 8601
  status: TransactionStatus;
};

export type Receipt = {
  transaction: Transaction;
  newBalanceCents: Cents;
};

// Output of validateTransfer: amount is guaranteed valid and recipient is trimmed.
export type ValidTransfer = {
  amountCents: Cents;
  recipient: string;
};
