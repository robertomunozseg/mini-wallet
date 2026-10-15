import type { ApiError } from "@/domain/errors";
import { asCents } from "@/domain/money";
import { sortMovements } from "@/domain/movements";
import type { Result } from "@/domain/result";
import type { Cents, Contact, Movement, Receipt, User } from "@/domain/types";

type StoredOutcome = Result<Receipt, ApiError>;

type StoredEntry = { outcome: StoredOutcome; storedAt: number };

type Db = {
  user: User;
  balanceCents: Cents;
  movements: Movement[];
  contacts: Contact[];
  outcomesByKey: Map<string, StoredEntry>;
  receiptsById: Map<string, Receipt>;
};

const movement = (
  id: string,
  type: Movement["type"],
  amountCents: number,
  counterpartName: string,
  createdAt: string,
  status: Movement["status"] = "completed",
): Movement => ({
  id,
  type,
  amountCents: asCents(amountCents),
  counterpartName,
  createdAt,
  status,
});

const createInitialDb = (): Db => ({
  user: { id: "user-demo", name: "Demo User", email: "demo@example.com" },
  balanceCents: asCents(1_250_000), // 12,500.00 MXN
  movements: [
    movement("mov-001", "incoming", 350_000, "Payroll", "2026-10-01T09:00:00.000Z"),
    movement("mov-002", "outgoing", 120_050, "Ana García", "2026-10-02T14:30:00.000Z"),
    movement("mov-003", "outgoing", 45_000, "Luis Hernández", "2026-10-03T18:10:00.000Z"),
    movement("mov-004", "incoming", 80_000, "María López", "2026-10-05T11:45:00.000Z"),
    movement("mov-005", "outgoing", 15_000, "Carlos Ruiz", "2026-10-06T20:05:00.000Z"),
    movement("mov-006", "incoming", 200_000, "Refund", "2026-10-08T08:20:00.000Z", "pending"),
    movement("mov-007", "outgoing", 60_000, "Ana García", "2026-10-09T16:00:00.000Z", "failed"),
    movement("mov-008", "outgoing", 99_900, "Luis Hernández", "2026-10-10T13:15:00.000Z"),
  ],
  contacts: [
    {
      id: "contact-1",
      name: "Ana García",
      phoneOrEmail: "ana.garcia@example.com",
      isFavorite: true,
    },
    { id: "contact-2", name: "Luis Hernández", phoneOrEmail: "5512345678", isFavorite: true },
    { id: "contact-3", name: "María López", phoneOrEmail: "5598765432", isFavorite: true },
    {
      id: "contact-4",
      name: "Carlos Ruiz",
      phoneOrEmail: "carlos.ruiz@example.com",
      isFavorite: false,
    },
  ],
  outcomesByKey: new Map(),
  receiptsById: new Map(),
});

// In dev, hot reload re-runs this module, so the data is kept on globalThis to survive it.
const globalForDb = globalThis as unknown as { miniWalletDb?: Db };

// The data is private to this file: the rest of the app only uses the functions below.
const db = (): Db => {
  globalForDb.miniWalletDb ??= createInitialDb();
  return globalForDb.miniWalletDb;
};

// Used by tests to start from the initial data.
export const resetDb = (): void => {
  globalForDb.miniWalletDb = createInitialDb();
};

export const getUser = (): User => ({ ...db().user });

export const getBalance = (): Cents => db().balanceCents;

export const setBalance = (balanceCents: Cents): void => {
  db().balanceCents = balanceCents;
};

// Newest first (see sortMovements).
export const listMovements = (): Movement[] =>
  sortMovements(db().movements).map((item) => ({ ...item }));

export const addMovement = (item: Movement): void => {
  db().movements.push({ ...item });
};

export const listContacts = (): Contact[] => db().contacts.map((contact) => ({ ...contact }));

export const addContact = (contact: Contact): void => {
  db().contacts.push({ ...contact });
};

// Both stores below must not grow forever. A Map keeps insertion order, so the first key is
// the oldest and that is the one dropped when the limit is passed.
const dropOldest = (map: Map<string, unknown>, limit: number): void => {
  while (map.size > limit) {
    const oldest = map.keys().next();
    if (oldest.done) break;
    map.delete(oldest.value);
  }
};

// Idempotency: the result of each transfer by key. Entries expire after 24 h and there is a
// limit. A real system would use a TTL in Redis or a database.
export const OUTCOME_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_STORED_OUTCOMES = 10_000;

export const getOutcome = (idempotencyKey: string, now = Date.now()): StoredOutcome | undefined => {
  const outcomes = db().outcomesByKey;
  const entry = outcomes.get(idempotencyKey);
  if (!entry) return undefined;

  if (now - entry.storedAt > OUTCOME_TTL_MS) {
    outcomes.delete(idempotencyKey);
    return undefined;
  }
  return entry.outcome;
};

export const saveOutcome = (
  idempotencyKey: string,
  outcome: StoredOutcome,
  now = Date.now(),
): void => {
  const outcomes = db().outcomesByKey;
  // Delete first so a repeated key moves to the end (the newest).
  outcomes.delete(idempotencyKey);
  outcomes.set(idempotencyKey, { outcome, storedAt: now });
  dropOldest(outcomes, MAX_STORED_OUTCOMES);
};

export const outcomeCount = (): number => db().outcomesByKey.size;

// Receipts by transaction id, so the receipt page can be opened (and reloaded) later.
export const MAX_STORED_RECEIPTS = 10_000;

export const saveReceipt = (receipt: Receipt): void => {
  const receipts = db().receiptsById;
  receipts.set(receipt.transaction.id, receipt);
  dropOldest(receipts, MAX_STORED_RECEIPTS);
};

export const getReceiptById = (transactionId: string): Receipt | undefined =>
  db().receiptsById.get(transactionId);

export const receiptCount = (): number => db().receiptsById.size;
