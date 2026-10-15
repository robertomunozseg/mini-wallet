"use client";

import { SCENARIO_HEADER, type ContactsResponse, type ListScenario } from "@/domain/api";
import type { Page } from "@/domain/pagination";
import type { Contact } from "@/domain/types";
import { usePaginatedList, type PaginatedList } from "@/lib/use-paginated-list";

// Module level so its identity never changes (usePaginatedList depends on it).
const selectContacts = (response: ContactsResponse): Page<Contact> => {
  return { items: response.contacts, nextCursor: response.nextCursor };
};
// Contacts that match `query`, page by page. The search runs on the server, so the browser
// never downloads the whole address book. Pass a debounced query, or every key press sends
// a request.
export const useContacts = (query: string, scenario?: ListScenario): PaginatedList<Contact> => {
  const search = query.trim();
  return usePaginatedList({
    url: "/contacts",
    params: search === "" ? undefined : { q: search },
    headers: scenario ? { [SCENARIO_HEADER]: scenario } : undefined,
    select: selectContacts,
  });
};
