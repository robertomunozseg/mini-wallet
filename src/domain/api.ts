import type { Account, Contact, Movement, Receipt, User } from "./types";

// Response bodies of the API. Shared by route handlers (server) and hooks (client).

export type LoginResponse = { user: User };
export type LogoutResponse = { ok: true };
export type AccountResponse = { account: Account };
export type MovementsResponse = { movements: Movement[] };
export type ContactsResponse = { contacts: Contact[] };
export type ContactResponse = { contact: Contact };
export type TransactionResponse = { receipt: Receipt };

// Header that forces a mock scenario (used by tests and demos).
export const SCENARIO_HEADER = "x-mock-scenario";

// GET /api/movements has its own scenarios: an empty list or a server error.
export type MovementsScenario = "empty" | "error";

// Used by the API (header value) and by the Home page (?scenario= query param).
export function parseMovementsScenario(value: string | null | undefined): MovementsScenario | null {
  const text = value?.trim();
  return text === "empty" || text === "error" ? text : null;
}
