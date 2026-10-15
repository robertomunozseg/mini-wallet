import type { Account, Contact, Movement, Receipt, User } from "./types";

// Response bodies of the API. Shared by route handlers (server) and hooks (client).

export type LoginResponse = { user: User };
export type LogoutResponse = { ok: true };
export type AccountResponse = { account: Account };
// Lists are paginated: nextCursor is null on the last page.
export type MovementsResponse = { movements: Movement[]; nextCursor: string | null };
export type ContactsResponse = { contacts: Contact[]; nextCursor: string | null };
export type ContactResponse = { contact: Contact };
export type TransactionResponse = { receipt: Receipt };

// Header that forces a mock scenario (used by tests and demos).
export const SCENARIO_HEADER = "x-mock-scenario";

// Scenarios of POST /transactions. Shared so the demo selector of the UI can list them.
export const SCENARIOS = [
  "success",
  "network_error",
  "insufficient_funds",
  "timeout",
  "unknown_error",
] as const;

export type Scenario = (typeof SCENARIOS)[number];

// Scenarios of the list endpoints (GET /movements and GET /contacts):
// - empty: an empty list. error: a server error.
// - large: a big generated dataset (10,000 movements, 5,000 contacts) to try pagination and
//   virtualization. It only affects reads; creating contacts or transfers still uses the real data.
export type ListScenario = "empty" | "error" | "large";

// Used by the API (header value) and by the Home page (?scenario= in the URL).
export const parseListScenario = (value: string | null | undefined): ListScenario | null => {
  const text = value?.trim();
  return text === "empty" || text === "error" || text === "large" ? text : null;
};
