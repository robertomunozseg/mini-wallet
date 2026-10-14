import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SCENARIO_HEADER } from "@/domain/api";
import { installHttpAdapter, jsonResponse, networkError } from "@/test-utils/http-adapter";
import { useMovements } from "../hooks/useMovements";

const movements = [
  {
    id: "mov-1",
    type: "incoming",
    amountCents: 350_000,
    counterpartName: "Payroll",
    createdAt: "2026-10-01T09:00:00.000Z",
    status: "completed",
  },
];

describe("useMovements", () => {
  let restoreAdapter = () => {};

  afterEach(() => {
    restoreAdapter();
  });

  it("starts loading and returns the movements", async () => {
    restoreAdapter = installHttpAdapter((config) => jsonResponse(config, 200, { movements }));
    const { result } = renderHook(() => useMovements());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.movements).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.movements).toEqual(movements);
    expect(result.current.error).toBeNull();
  });

  it("requests GET /movements without a scenario header by default", async () => {
    const requests: unknown[] = [];
    restoreAdapter = installHttpAdapter((config) => {
      requests.push({
        method: config.method,
        url: config.url,
        scenario: config.headers.get(SCENARIO_HEADER),
      });
      return jsonResponse(config, 200, { movements });
    });
    const { result } = renderHook(() => useMovements());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(requests).toStrictEqual([{ method: "get", url: "/movements", scenario: undefined }]);
  });

  it.each(["empty", "error"] as const)("forwards the %s scenario as a header", async (scenario) => {
    const headers: unknown[] = [];
    restoreAdapter = installHttpAdapter((config) => {
      headers.push(config.headers.get(SCENARIO_HEADER));
      return jsonResponse(config, 200, { movements: [] });
    });
    const { result } = renderHook(() => useMovements(scenario));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(headers).toEqual([scenario]);
  });

  it("returns an empty list as an empty array, not as null", async () => {
    restoreAdapter = installHttpAdapter((config) => jsonResponse(config, 200, { movements: [] }));
    const { result } = renderHook(() => useMovements());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.movements).toEqual([]);
  });

  it("maps a server error", async () => {
    restoreAdapter = installHttpAdapter((config) =>
      jsonResponse(config, 500, { error: { code: "UNKNOWN_ERROR", message: "x" } }),
    );
    const { result } = renderHook(() => useMovements("error"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toMatchObject({ code: "UNKNOWN_ERROR" });
    expect(result.current.movements).toBeNull();
  });

  it("maps a network error", async () => {
    restoreAdapter = installHttpAdapter((config) => networkError(config));
    const { result } = renderHook(() => useMovements());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("refetch repeats the request and recovers from an error", async () => {
    let attempts = 0;
    restoreAdapter = installHttpAdapter((config) => {
      attempts += 1;
      return attempts === 1 ? networkError(config) : jsonResponse(config, 200, { movements });
    });
    const { result } = renderHook(() => useMovements());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.movements).toEqual(movements));

    expect(attempts).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it("does not throw when a refetch fails", async () => {
    restoreAdapter = installHttpAdapter((config) => networkError(config));
    const { result } = renderHook(() => useMovements());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(() =>
      act(() => {
        result.current.refetch();
      }),
    ).not.toThrow();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toMatchObject({ code: "NETWORK_ERROR" });
  });
});
