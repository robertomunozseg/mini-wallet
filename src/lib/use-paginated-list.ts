"use client";

import axios from "axios";
import useAxios from "axios-hooks";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { ApiError, ApiErrorBody } from "@/domain/errors";
import { DEFAULT_PAGE_SIZE, type Page } from "@/domain/pagination";
import { mapApiError } from "./map-api-error";

type Mode = "first" | "more";

type State<T> = {
  items: T[];
  nextCursor: string | null;
  phase: "idle" | Mode;
  error: ApiError | null; // the first page failed (initial load or a new search)
  moreError: ApiError | null; // a later page failed; the items already loaded stay
};

type Action<T> =
  | { type: "start"; mode: Mode }
  | { type: "success"; mode: Mode; page: Page<T> }
  | { type: "failure"; mode: Mode; error: ApiError };

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
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
}

function initialState<T>(initialPage: Page<T> | undefined): State<T> {
  return {
    items: initialPage?.items ?? [],
    nextCursor: initialPage?.nextCursor ?? null,
    // Without a first page from the server, the list starts loading it.
    phase: initialPage ? "idle" : "first",
    error: null,
    moreError: null,
  };
}

type Options<R, T> = {
  url: string;
  // Query string (e.g. { q: "ana" }). A change resets the list and loads page 1 again.
  params?: Record<string, string | undefined>;
  headers?: Record<string, string>;
  limit?: number;
  // Reads the page out of the response. It must have a stable identity (define it at module level).
  select: (response: R) => Page<T>;
  // First page already loaded on the server: it is shown right away and not requested again.
  initialPage?: Page<T> | undefined;
};

export type PaginatedList<T> = {
  items: T[];
  isLoading: boolean; // loading the first page
  isLoadingMore: boolean;
  error: ApiError | null;
  loadMoreError: ApiError | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
};

type Query = { params?: Record<string, string | undefined>; headers?: Record<string, string> };

// A list loaded in pages with a cursor ("load more" or infinite scroll). It accumulates the
// pages, cancels the previous request when a new one starts and ignores answers that arrive late.
export function usePaginatedList<R, T>({
  url,
  params,
  headers,
  limit = DEFAULT_PAGE_SIZE,
  select,
  initialPage,
}: Options<R, T>): PaginatedList<T> {
  // The key says which list this is. Callers build `params` and `headers` on every render, so
  // comparing their JSON avoids resetting the list when only their identity changed.
  const queryKey = JSON.stringify({ params, headers });
  const query = useMemo(() => JSON.parse(queryKey) as Query, [queryKey]);

  // autoCancel (the default) makes axios-hooks cancel the previous request when a new one starts,
  // so a search that is replaced by a newer one stops running in the browser and on the server.
  const [, execute] = useAxios<R, undefined, ApiErrorBody>(
    { url },
    { manual: true, useCache: false },
  );
  const [state, dispatch] = useReducer(reducer<T>, initialPage, initialState<T>);

  const latestRequest = useRef(0);
  const loadedKey = useRef<string | null>(initialPage ? queryKey : null);
  // False while the first page of the current query is still loading (see the effect below).
  const firstPageSettled = useRef(initialPage !== undefined);
  // True while a "load more" request is running. `phase` is read from the last render, so it
  // cannot stop two calls made in the same tick (React Strict Mode runs effects twice in
  // development); this ref is updated immediately.
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

  // Loads page 1 on mount (unless the server sent it) and again whenever the query changes.
  useEffect(() => {
    if (loadedKey.current === queryKey) return;
    loadedKey.current = queryKey;
    void fetchPage(null, "first");

    return () => {
      // React Strict Mode (development) mounts, unmounts and mounts again, and axios-hooks cancels
      // the request on that unmount. If the first page had not arrived, forget that it was
      // requested so the next mount requests it again; otherwise the list would load forever.
      if (!firstPageSettled.current) loadedKey.current = null;
    };
  }, [queryKey, fetchPage]);

  const { phase, nextCursor } = state;

  // Memoized so the infinite scroll effect that depends on it does not run on every render.
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
}
