import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SCENARIO_HEADER } from "@/domain/api";
import { installHttpAdapter, jsonResponse, networkError } from "@/test-utils/http-adapter";
import { useContacts } from "../hooks/useContacts";

const contacts = [
  { id: "1", name: "Ana García", phoneOrEmail: "ana.garcia@example.com", isFavorite: true },
];

type Seen = { q: unknown; limit: unknown; cursor: unknown; scenario: unknown };

function recordingServer(body: unknown = { contacts, nextCursor: null }) {
  const requests: Seen[] = [];
  const handler = (config: Parameters<Parameters<typeof installHttpAdapter>[0]>[0]) => {
    const params = (config.params ?? {}) as Record<string, unknown>;
    requests.push({
      q: params.q,
      limit: params.limit,
      cursor: params.cursor,
      scenario: config.headers.get(SCENARIO_HEADER),
    });
    return jsonResponse(config, 200, body);
  };
  return { requests, handler };
}

describe("useContacts", () => {
  let restore = () => {};

  afterEach(() => {
    restore();
  });

  it("starts loading and returns the contacts", async () => {
    const server = recordingServer();
    restore = installHttpAdapter(server.handler);
    const { result } = renderHook(() => useContacts(""));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toEqual(contacts);
    expect(result.current.error).toBeNull();
  });

  it("requests GET /contacts with the page size and without q for an empty query", async () => {
    const server = recordingServer();
    restore = installHttpAdapter(server.handler);
    const { result } = renderHook(() => useContacts(""));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(server.requests).toStrictEqual([
      { q: undefined, limit: 20, cursor: undefined, scenario: undefined },
    ]);
  });

  it("sends the search text as q, trimmed", async () => {
    const server = recordingServer();
    restore = installHttpAdapter(server.handler);
    const { result } = renderHook(() => useContacts("  garcia  "));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(server.requests[0]?.q).toBe("garcia");
  });

  it("does not send q for a blank query", async () => {
    const server = recordingServer();
    restore = installHttpAdapter(server.handler);
    const { result } = renderHook(() => useContacts("   "));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(server.requests[0]?.q).toBeUndefined();
  });

  it("forwards the scenario as a header", async () => {
    const server = recordingServer();
    restore = installHttpAdapter(server.handler);
    const { result } = renderHook(() => useContacts("", "large"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(server.requests[0]?.scenario).toBe("large");
  });

  it("makes a new request, from page 1, when the query changes", async () => {
    const server = recordingServer({ contacts, nextCursor: "cursor-1" });
    restore = installHttpAdapter(server.handler);
    const { result, rerender } = renderHook(({ query }) => useContacts(query), {
      initialProps: { query: "" },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.loadMore());
    await waitFor(() => expect(server.requests).toHaveLength(2));
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

    rerender({ query: "ana" });
    await waitFor(() => expect(server.requests).toHaveLength(3));

    expect(server.requests[2]).toMatchObject({ q: "ana", cursor: undefined });
  });

  it("does not make a new request when the query is the same text", async () => {
    const server = recordingServer();
    restore = installHttpAdapter(server.handler);
    const { result, rerender } = renderHook(({ query }) => useContacts(query), {
      initialProps: { query: "ana" },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ query: "ana" });
    rerender({ query: " ana " }); // trimmed: still the same search
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(server.requests).toHaveLength(1);
  });

  it("loads the next page with the cursor", async () => {
    const server = recordingServer({ contacts, nextCursor: "cursor-1" });
    restore = installHttpAdapter(server.handler);
    const { result } = renderHook(() => useContacts(""));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasMore).toBe(true);
    act(() => result.current.loadMore());
    await waitFor(() => expect(server.requests).toHaveLength(2));

    expect(server.requests[1]?.cursor).toBe("cursor-1");
  });

  it("returns an empty list as an empty array", async () => {
    const server = recordingServer({ contacts: [], nextCursor: null });
    restore = installHttpAdapter(server.handler);
    const { result } = renderHook(() => useContacts(""));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });

  it("maps a server error", async () => {
    restore = installHttpAdapter((config) =>
      jsonResponse(config, 500, { error: { code: "UNKNOWN_ERROR", message: "x" } }),
    );
    const { result } = renderHook(() => useContacts(""));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toMatchObject({ code: "UNKNOWN_ERROR" });
    expect(result.current.items).toEqual([]);
  });

  it("maps a network error", async () => {
    restore = installHttpAdapter((config) => networkError(config));
    const { result } = renderHook(() => useContacts(""));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("refetch repeats the request and recovers from an error", async () => {
    let attempts = 0;
    restore = installHttpAdapter((config) => {
      attempts += 1;
      return attempts === 1
        ? networkError(config)
        : jsonResponse(config, 200, { contacts, nextCursor: null });
    });
    const { result } = renderHook(() => useContacts(""));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.items).toEqual(contacts));

    expect(attempts).toBe(2);
    expect(result.current.error).toBeNull();
  });
});
