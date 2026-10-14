import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { installHttpAdapter, jsonResponse, networkError } from "@/test-utils/http-adapter";
import { useContacts } from "../hooks/useContacts";

const contacts = [
  { id: "1", name: "Ana García", phoneOrEmail: "ana.garcia@example.com", isFavorite: true },
];

describe("useContacts", () => {
  let restoreAdapter = () => {};

  afterEach(() => {
    restoreAdapter();
  });

  it("starts loading and returns the contacts", async () => {
    const requests: unknown[] = [];
    restoreAdapter = installHttpAdapter((config) => {
      requests.push({ method: config.method, url: config.url });
      return jsonResponse(config, 200, { contacts });
    });
    const { result } = renderHook(() => useContacts());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.contacts).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.contacts).toEqual(contacts);
    expect(result.current.error).toBeNull();
    expect(requests).toEqual([{ method: "get", url: "/contacts" }]);
  });

  it("returns an empty list as an empty array", async () => {
    restoreAdapter = installHttpAdapter((config) => jsonResponse(config, 200, { contacts: [] }));
    const { result } = renderHook(() => useContacts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.contacts).toEqual([]);
  });

  it("maps a server error", async () => {
    restoreAdapter = installHttpAdapter((config) =>
      jsonResponse(config, 500, { error: { code: "UNKNOWN_ERROR", message: "x" } }),
    );
    const { result } = renderHook(() => useContacts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toMatchObject({ code: "UNKNOWN_ERROR" });
    expect(result.current.contacts).toBeNull();
  });

  it("maps a network error", async () => {
    restoreAdapter = installHttpAdapter((config) => networkError(config));
    const { result } = renderHook(() => useContacts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("refetch repeats the request and recovers from an error", async () => {
    let attempts = 0;
    restoreAdapter = installHttpAdapter((config) => {
      attempts += 1;
      return attempts === 1 ? networkError(config) : jsonResponse(config, 200, { contacts });
    });
    const { result } = renderHook(() => useContacts());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.contacts).toEqual(contacts));

    expect(attempts).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it("does not throw when a refetch fails", async () => {
    restoreAdapter = installHttpAdapter((config) => networkError(config));
    const { result } = renderHook(() => useContacts());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(() =>
      act(() => {
        result.current.refetch();
      }),
    ).not.toThrow();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
