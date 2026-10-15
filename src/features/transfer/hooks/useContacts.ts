"use client";

import { SCENARIO_HEADER, type ContactsResponse, type ListScenario } from "@/domain/api";
import type { Page } from "@/domain/pagination";
import type { Contact } from "@/domain/types";
import { usePaginatedList, type PaginatedList } from "@/lib/use-paginated-list";

// Module level so its identity never changes (usePaginatedList depends on it).
const selectContacts = (response: ContactsResponse): Page<Contact> => {
  return { items: response.contacts, nextCursor: response.nextCursor };
};
// Contacts matching `query`, in pages: the search runs on the server, so the browser never
// downloads the whole address book. Every new query starts again from page 1.
// Pass an already debounced query, otherwise every key press would send a request.
export const useContacts = (query: string, scenario?: ListScenario): PaginatedList<Contact> => {
  const search = query.trim();
  return usePaginatedList({
    url: "/contacts",
    params: search === "" ? undefined : { q: search },
    headers: scenario ? { [SCENARIO_HEADER]: scenario } : undefined,
    select: selectContacts,
  });
};
