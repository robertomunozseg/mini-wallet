import type { ApiError } from "@/domain/errors";
import { asCents } from "@/domain/money";
import type { Result } from "@/domain/result";
import type { Cents, Contact, Movement, Receipt, User } from "@/domain/types";

export type StoredOutcome = Result<Receipt, ApiError>;

type Db = {
  user: User;
  balanceCents: Cents;
  movements: Movement[];
  contacts: Contact[];
  outcomesByKey: Map<string, StoredOutcome>;
};

function createInitialDb(): Db {
  return {
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
  };
}

function movement(
  id: string,
  type: Movement["type"],
  amountCents: number,
  counterpartName: string,
  createdAt: string,
  status: Movement["status"] = "completed",
): Movement {
  return { id, type, amountCents: asCents(amountCents), counterpartName, createdAt, status };
}

// Module state is recreated on every hot reload in dev, so the instance is kept on globalThis.
const globalForDb = globalThis as unknown as { miniWalletDb?: Db };

// The mutable state is private to this module: callers only get the functions below.
function db(): Db {
  const existing = globalForDb.miniWalletDb;
  if (existing) return existing;
  const created = createInitialDb();
  globalForDb.miniWalletDb = created;
  return created;
}

export function resetDb(): void {
  globalForDb.miniWalletDb = createInitialDb();
}

export function getUser(): User {
  return { ...db().user };
}

export function getBalance(): Cents {
  return db().balanceCents;
}

export function setBalance(balanceCents: Cents): void {
  db().balanceCents = balanceCents;
}

// Newest first.
export function listMovements(): Movement[] {
  return db()
    .movements.map((item) => ({ ...item }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addMovement(item: Movement): void {
  db().movements.push({ ...item });
}

export function listContacts(): Contact[] {
  return db().contacts.map((contact) => ({ ...contact }));
}

export function addContact(contact: Contact): void {
  db().contacts.push({ ...contact });
}

export function getOutcome(idempotencyKey: string): StoredOutcome | undefined {
  return db().outcomesByKey.get(idempotencyKey);
}

export function saveOutcome(idempotencyKey: string, outcome: StoredOutcome): void {
  db().outcomesByKey.set(idempotencyKey, outcome);
}
