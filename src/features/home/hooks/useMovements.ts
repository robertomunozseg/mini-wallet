"use client";

import { SCENARIO_HEADER, type ListScenario, type MovementsResponse } from "@/domain/api";
import type { Page } from "@/domain/pagination";
import type { Movement } from "@/domain/types";
import { usePaginatedList, type PaginatedList } from "@/lib/use-paginated-list";

// Module level so its identity never changes (usePaginatedList depends on it).
const selectMovements = (response: MovementsResponse): Page<Movement> => {
  return { items: response.movements, nextCursor: response.nextCursor };
};
// Movements in pages, newest first. `initialPage` is the first page the server already loaded.
// `scenario` is forwarded as x-mock-scenario to force the empty, error or large states.
export const useMovements = (
  scenario?: ListScenario,
  initialPage?: Page<Movement>,
): PaginatedList<Movement> => {
  return usePaginatedList({
    url: "/movements",
    headers: scenario ? { [SCENARIO_HEADER]: scenario } : undefined,
    select: selectMovements,
    initialPage,
  });
};
