"use client";

import axios from "axios";
import useAxios from "axios-hooks";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { ApiError, ApiErrorBody } from "@/domain/errors";
import { DEFAULT_PAGE_SIZE, type Page } from "@/domain/pagination";
import { mapApiError } from "./map-api-error";

// "first" is page 1 (first load or a new search); "more" is any later page.
type Mode = "first" | "more";

type State<T> = {
  items: T[];
  nextCursor: string | null;
  phase: "idle" | Mode;
  error: ApiError | null; // page 1 failed
  moreError: ApiError | null; // a later page failed; the items already loaded stay
};

type Action<T> =
  | { type: "start"; mode: Mode }
  | { type: "success"; mode: Mode; page: Page<T> }
  | { type: "failure"; mode: Mode; error: ApiError };

const listReducer = <T>(state: State<T>, action: Action<T>): State<T> => {
  switch (action.type) {
    case "start":
      // The old items stay on screen while the new ones load.
      return { ...state, phase: action.mode, error: null, moreError: null };
    case "success":
      return {
        items: action.mode === "first" ? action.page.items : [...state.items, ...action.page.items],
        nextCursor: action.page.nextCursor,
        phase: "idle",
        error: null,
        moreError: null,
      };
    case "failure":
      return action.mode === "first"
        ? { ...state, phase: "idle", error: action.error }
        : { ...state, phase: "idle", moreError: action.error };
  }
};

const getInitialState = <T>(initialPage: Page<T> | undefined): State<T> => ({
  items: initialPage?.items ?? [],
  nextCursor: initialPage?.nextCursor ?? null,
  // No page from the server: start by loading it.
  phase: initialPage ? "idle" : "first",
  error: null,
  moreError: null,
});

type Query = { params?: Record<string, string | undefined>; headers?: Record<string, string> };

type Options<R, T> = Query & {
  url: string;
  limit?: number;
  // Picks the page out of the response. Define it outside the component so it never changes.
  select: (response: R) => Page<T>;
  // Page 1 already loaded on the server: shown right away and not requested again.
  initialPage?: Page<T> | undefined;
};

export type PaginatedList<T> = {
  items: T[];
  isLoading: boolean; // loading page 1
  isLoadingMore: boolean;
  error: ApiError | null;
  loadMoreError: ApiError | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
};

// A list loaded page by page with a cursor ("load more" or infinite scroll).
// It adds each page to the list, cancels the previous request when a new one starts and
// ignores answers that arrive late.
export const usePaginatedList = <R, T>({
  url,
  params,
  headers,
  limit = DEFAULT_PAGE_SIZE,
  select,
  initialPage,
}: Options<R, T>): PaginatedList<T> => {
  // Callers build params and headers on every render, so compare their JSON: the list only
  // resets when the content changes, not the object.
  const queryKey = JSON.stringify({ params, headers });
  const query = useMemo(() => JSON.parse(queryKey) as Query, [queryKey]);

  // axios-hooks cancels the previous request when a new one starts (autoCancel).
  const [, execute] = useAxios<R, undefined, ApiErrorBody>(
    { url },
    { manual: true, useCache: false },
  );
  const [state, dispatch] = useReducer(listReducer<T>, initialPage, getInitialState<T>);

  const latestRequest = useRef(0);
  const loadedKey = useRef<string | null>(initialPage ? queryKey : null);
  const firstPageSettled = useRef(initialPage !== undefined);
  // A ref, not `phase`: two calls in the same tick (Strict Mode runs effects twice) would both
  // see the old `phase`.
  const moreInFlight = useRef(false);

  const fetchPage = useCallback(
    async (cursor: string | null, mode: Mode) => {
      const requestId = ++latestRequest.current;
      moreInFlight.current = mode === "more";
      if (mode === "first") firstPageSettled.current = false;
      dispatch({ type: "start", mode });

      try {
        const response = await execute({
          params: { ...query.params, limit, cursor: cursor ?? undefined },
          headers: query.headers,
        });
        if (requestId !== latestRequest.current) return; // a newer request took over
        moreInFlight.current = false;
        if (mode === "first") firstPageSettled.current = true;
        dispatch({ type: "success", mode, page: select(response.data) });
      } catch (error) {
        if (requestId !== latestRequest.current || axios.isCancel(error)) return;
        moreInFlight.current = false;
        if (mode === "first") firstPageSettled.current = true;
        dispatch({ type: "failure", mode, error: mapApiError(error) });
      }
    },
    [execute, query, limit, select],
  );

  // Load page 1 on mount (unless the server sent it) and whenever the query changes.
  useEffect(() => {
    if (loadedKey.current === queryKey) return;
    loadedKey.current = queryKey;
    void fetchPage(null, "first");

    return () => {
      // Strict Mode mounts, unmounts and mounts again, and axios-hooks cancels the request on
      // that unmount. If page 1 had not arrived, forget it was requested so the next mount asks
      // again; otherwise the list would load forever.
      if (!firstPageSettled.current) loadedKey.current = null;
    };
  }, [queryKey, fetchPage]);

  const { phase, nextCursor } = state;

  const loadMore = useCallback(() => {
    if (moreInFlight.current || phase !== "idle" || nextCursor === null) return;
    void fetchPage(nextCursor, "more");
  }, [fetchPage, phase, nextCursor]);

  const refetch = useCallback(() => {
    void fetchPage(null, "first");
  }, [fetchPage]);

  return {
    items: state.items,
    isLoading: phase === "first",
    isLoadingMore: phase === "more",
    error: state.error,
    loadMoreError: state.moreError,
    hasMore: nextCursor !== null,
    loadMore,
    refetch,
  };
};
