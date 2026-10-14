import type { Account, Contact, Movement, Receipt, User } from "./types";

// Response bodies of the API. Shared by route handlers (server) and hooks (client).

export type LoginResponse = { user: User };
export type LogoutResponse = { ok: true };
export type AccountResponse = { account: Account };
export type MovementsResponse = { movements: Movement[] };
export type ContactsResponse = { contacts: Contact[] };
export type ContactResponse = { contact: Contact };
export type TransactionResponse = { receipt: Receipt };
