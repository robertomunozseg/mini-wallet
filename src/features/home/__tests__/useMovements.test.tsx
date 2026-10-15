import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Page } from "@/domain/pagination";
import type { Movement } from "@/domain/types";
import { installHttpAdapter, jsonResponse, networkError } from "@/test-utils/http-adapter";
import { useMovements } from "../hooks/useMovements";

const movement = (id: string): Movement => {
  return {
    id,
    type: "incoming",
    amountCents: 350_000 as Movement["amountCents"],
    counterpartName: "Payroll",
    createdAt: "2026-10-01T09:00:00.000Z",
    status: "completed",
  };
};
describe("useMovements", () => {
  let restore = () => {};

  afterEach(() => {
    restore();
  });

  it("starts loading and returns the movements", async () => {
    restore = installHttpAdapter((config) =>
      jsonResponse(config, 200, { movements: [movement("m1")], nextCursor: null }),
    );
    const { result } = renderHook(() => useMovements());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.items).toEqual([movement("m1")]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe("pagination", () => {
    const initialPage: Page<Movement> = {
      items: [movement("m1"), movement("m2")],
      nextCursor: "cursor-1",
    };

    it("uses the first page the server already loaded, without a request", async () => {
      let requests = 0;
      restore = installHttpAdapter((config) => {
        requests += 1;
        return jsonResponse(config, 200, { movements: [], nextCursor: null });
      });
      const { result } = renderHook(() => useMovements(undefined, initialPage));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.items.map((item) => item.id)).toEqual(["m1", "m2"]);
      expect(result.current.hasMore).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 40));
      expect(requests).toBe(0);
    });

    it("loads the next page with the cursor and appends it", async () => {
      const cursors: unknown[] = [];
      restore = installHttpAdapter((config) => {
        cursors.push((config.params as { cursor?: string }).cursor);
        return jsonResponse(config, 200, { movements: [movement("m3")], nextCursor: null });
      });
      const { result } = renderHook(() => useMovements(undefined, initialPage));

      act(() => result.current.loadMore());
      await waitFor(() => expect(result.current.items).toHaveLength(3));

      expect(cursors).toEqual(["cursor-1"]);
      expect(result.current.items.map((item) => item.id)).toEqual(["m1", "m2", "m3"]);
      expect(result.current.hasMore).toBe(false);
    });
  });

  it("maps a server error", async () => {
    restore = installHttpAdapter((config) =>
      jsonResponse(config, 500, { error: { code: "UNKNOWN_ERROR", message: "x" } }),
    );
    const { result } = renderHook(() => useMovements("error"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toMatchObject({ code: "UNKNOWN_ERROR" });
    expect(result.current.items).toEqual([]);
  });

  it("refetch repeats the request and recovers from an error", async () => {
    let attempts = 0;
    restore = installHttpAdapter((config) => {
      attempts += 1;
      return attempts === 1
        ? networkError(config)
        : jsonResponse(config, 200, { movements: [movement("m1")], nextCursor: null });
    });
    const { result } = renderHook(() => useMovements());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    expect(attempts).toBe(2);
    expect(result.current.error).toBeNull();
  });
});
