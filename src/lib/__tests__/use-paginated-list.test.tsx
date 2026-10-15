import { act, renderHook, waitFor } from "@testing-library/react";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it } from "vitest";
import type { Page } from "@/domain/pagination";
import { installHttpAdapter, jsonResponse, networkError } from "@/test-utils/http-adapter";
import { usePaginatedList } from "../use-paginated-list";

type Item = { id: number };
type Response = { rows: Item[]; nextCursor: string | null };

// Module level, like in the real hooks: the hook needs a stable `select`.
const select = (response: Response): Page<Item> => {
  return { items: response.rows, nextCursor: response.nextCursor };
};
type HookProps = {
  params?: Record<string, string | undefined>;
  headers?: Record<string, string>;
  limit?: number;
  initialPage?: Page<Item>;
};

const setup = (initial: HookProps = {}) => {
  return renderHook(
    (props: HookProps) => usePaginatedList<Response, Item>({ url: "/items", select, ...props }),
    { initialProps: initial },
  );
};
const ids = (items: Item[]): number[] => {
  return items.map((item) => item.id);
};
// A fake server with 25 items served in pages by cursor ("c10" means "after item 10").
type Seen = { params: Record<string, unknown>; headers: unknown };

const pagedServer = (total = 25) => {
  const requests: Seen[] = [];
  const handler = (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const params = { ...config.params } as Record<string, unknown>;
    requests.push({ params, headers: config.headers.get("x-test") });
    const limit = Number(params.limit);
    const after = typeof params.cursor === "string" ? Number(params.cursor.slice(1)) : 0;
    const rows = Array.from({ length: Math.min(limit, total - after) }, (_, i) => ({
      id: after + i + 1,
    }));
    const last = rows.at(-1);
    const nextCursor = last && last.id < total ? `c${last.id}` : null;
    return jsonResponse(config, 200, { rows, nextCursor });
  };
  return { requests, handler };
};
describe("usePaginatedList", () => {
  let restore = () => {};
  afterEach(() => {
    restore();
    restore = () => {};
  });

  describe("first page", () => {
    it("is loading at first and then returns the items", async () => {
      const server = pagedServer();
      restore = installHttpAdapter(server.handler);
      const { result } = setup({ limit: 10 });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.items).toEqual([]);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(ids(result.current.items)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe("initial page from the server", () => {
    it("shows it right away and does not request it again", async () => {
      const server = pagedServer();
      restore = installHttpAdapter(server.handler);
      const { result } = setup({
        initialPage: { items: [{ id: 1 }, { id: 2 }], nextCursor: "c2" },
      });

      expect(result.current.isLoading).toBe(false);
      expect(ids(result.current.items)).toEqual([1, 2]);
      expect(result.current.hasMore).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(server.requests).toHaveLength(0);
    });
  });

  describe("loadMore", () => {
    it("appends the next page using the cursor", async () => {
      const server = pagedServer();
      restore = installHttpAdapter(server.handler);
      const { result } = setup({ limit: 10 });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.loadMore());
      expect(result.current.isLoadingMore).toBe(true);
      await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

      expect(server.requests[1]?.params.cursor).toBe("c10");
      expect(ids(result.current.items)).toHaveLength(20);
      expect(result.current.items[19]?.id).toBe(20);
    });

    it("ignores a second call while the first page is still loading", async () => {
      const server = pagedServer();
      restore = installHttpAdapter(server.handler);
      const { result } = setup({ limit: 10 });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.loadMore();
        result.current.loadMore();
        result.current.loadMore();
      });
      await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

      expect(server.requests).toHaveLength(2); // the first page and ONE more
      expect(result.current.items).toHaveLength(20);
    });
  });

  describe("changing the query", () => {
    it("starts again from page 1 with the new params and replaces the items", async () => {
      const server = pagedServer();
      restore = installHttpAdapter(server.handler);
      const { result, rerender } = setup({ params: { q: "a" }, limit: 10 });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => result.current.loadMore());
      await waitFor(() => expect(result.current.items).toHaveLength(20));

      rerender({ params: { q: "b" }, limit: 10 });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const last = server.requests.at(-1);
      expect(last?.params.q).toBe("b");
      expect(last?.params.cursor).toBeUndefined();
      expect(result.current.items).toHaveLength(10);
    });

    it("does not request again when only the identity of the params changed", async () => {
      const server = pagedServer();
      restore = installHttpAdapter(server.handler);
      const { result, rerender } = setup({ params: { q: "a" } });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      rerender({ params: { q: "a" } });
      rerender({ params: { q: "a" }, headers: undefined });
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(server.requests).toHaveLength(1);
    });

    it("ignores the answer of an older request that arrives late", async () => {
      const resolvers: Array<() => void> = [];
      restore = installHttpAdapter(
        (config) =>
          new Promise<AxiosResponse>((resolve) => {
            const q = (config.params as { q?: string }).q;
            resolvers.push(() =>
              resolve({
                data: { rows: [{ id: q === "slow" ? 100 : 200 }], nextCursor: null },
                status: 200,
                statusText: "",
                headers: {},
                config,
              }),
            );
          }),
      );
      const { result, rerender } = setup({ params: { q: "slow" } });
      await waitFor(() => expect(resolvers).toHaveLength(1));

      rerender({ params: { q: "fast" } });
      await waitFor(() => expect(resolvers).toHaveLength(2));

      // The newer request answers first, then the older one arrives late.
      await act(async () => {
        resolvers[1]?.();
      });
      await waitFor(() => expect(ids(result.current.items)).toEqual([200]));
      await act(async () => {
        resolvers[0]?.();
      });

      expect(ids(result.current.items)).toEqual([200]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("errors", () => {
    it("exposes a first-page error and recovers with refetch", async () => {
      let attempts = 0;
      const server = pagedServer();
      restore = installHttpAdapter((config) => {
        attempts += 1;
        return attempts === 1 ? networkError(config) : server.handler(config);
      });
      const { result } = setup({ limit: 10 });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toMatchObject({ code: "NETWORK_ERROR" });
      expect(result.current.items).toEqual([]);

      act(() => result.current.refetch());
      await waitFor(() => expect(result.current.items).toHaveLength(10));
      expect(result.current.error).toBeNull();
    });

    it("keeps the loaded items when a later page fails, and retries with loadMore", async () => {
      let attempts = 0;
      const server = pagedServer();
      restore = installHttpAdapter((config) => {
        attempts += 1;
        return attempts === 2 ? networkError(config) : server.handler(config);
      });
      const { result } = setup({ limit: 10 });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.loadMore());
      await waitFor(() => expect(result.current.loadMoreError).not.toBeNull());
      expect(result.current.loadMoreError).toMatchObject({ code: "NETWORK_ERROR" });
      expect(result.current.items).toHaveLength(10);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(true);

      act(() => result.current.loadMore());
      await waitFor(() => expect(result.current.items).toHaveLength(20));
      expect(result.current.loadMoreError).toBeNull();
    });
  });
});

describe("usePaginatedList in React Strict Mode (development)", () => {
  let restore = () => {};
  afterEach(() => {
    restore();
    restore = () => {};
  });

  // Strict Mode mounts, unmounts and mounts again every component. The list must still load.
  it("loads the first page and does not duplicate it", async () => {
    const server = pagedServer();
    restore = installHttpAdapter(server.handler);
    const { result } = renderHook(
      () => usePaginatedList<Response, Item>({ url: "/items", select, limit: 10 }),
      { reactStrictMode: true },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Strict Mode mounts twice, so the request may be sent twice (the first one is cancelled);
    // what matters is that the items appear once.
    expect(ids(result.current.items)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(server.requests.length).toBeLessThanOrEqual(2);
  });

  it("shows an error instead of loading forever when the first request fails", async () => {
    restore = installHttpAdapter((config) =>
      jsonResponse(config, 500, { error: { code: "UNKNOWN_ERROR", message: "x" } }),
    );
    const { result } = renderHook(
      () => usePaginatedList<Response, Item>({ url: "/items", select }),
      { reactStrictMode: true },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toMatchObject({ code: "UNKNOWN_ERROR" });
  });
});

describe("usePaginatedList cancelling requests", () => {
  let restore = () => {};
  afterEach(() => {
    restore();
    restore = () => {};
  });

  it("cancels the previous request when the query changes", async () => {
    const signals: AbortSignal[] = [];
    restore = installHttpAdapter(
      (config) =>
        new Promise<AxiosResponse>(() => {
          if (config.signal) signals.push(config.signal as AbortSignal);
          // never answers: the request stays in flight
        }),
    );
    const { rerender } = setup({ params: { q: "a" } });
    await waitFor(() => expect(signals).toHaveLength(1));
    expect(signals[0]?.aborted).toBe(false);

    rerender({ params: { q: "ab" } });
    await waitFor(() => expect(signals).toHaveLength(2));

    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
  });
});
