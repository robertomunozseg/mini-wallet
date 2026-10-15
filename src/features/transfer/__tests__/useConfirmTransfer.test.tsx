import { act, renderHook, waitFor } from "@testing-library/react";
import type { InternalAxiosRequestConfig } from "axios";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SCENARIO_HEADER } from "@/domain/api";
import { asCents } from "@/domain/money";
import {
  installHttpAdapter,
  jsonResponse,
  networkError,
  readBody,
  timeoutError,
} from "@/test-utils/http-adapter";
import { setAmount, setDemoScenario, setRecipient } from "@/store/slices/transferSlice";
import { makeStore } from "@/store/store";
import { SLOW_REQUEST_MS, useConfirmTransfer } from "../hooks/useConfirmTransfer";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const receipt = {
  transaction: {
    id: "tx-1",
    amountCents: 5_000,
    recipient: "Ana García",
    createdAt: "2026-10-14T12:00:00.000Z",
    status: "completed",
  },
  newBalanceCents: 95_000,
};

const failure = (code: string) => {
  return { error: { code, message: "server message" } };
};
const setup = () => {
  const store = makeStore();
  store.dispatch(setAmount(asCents(5_000)));
  store.dispatch(setRecipient("Ana García"));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return { store, ...renderHook(() => useConfirmTransfer(), { wrapper }) };
};
describe("useConfirmTransfer", () => {
  let restore = () => {};

  beforeEach(() => {
    router.push.mockReset();
    router.refresh.mockReset();
  });

  afterEach(() => {
    restore();
  });

  it("starts idle", () => {
    const { result } = setup();
    expect(result.current.state).toEqual({ status: "idle" });
  });

  describe("scenarios", () => {
    it("success: opens the receipt and refreshes the server data", async () => {
      restore = installHttpAdapter((config) => jsonResponse(config, 201, { receipt }));
      const { result } = setup();

      await act(() => result.current.confirm());

      expect(result.current.state).toEqual({ status: "success" });
      expect(router.push).toHaveBeenCalledWith("/transfer/receipt/tx-1");
      expect(router.refresh).toHaveBeenCalledTimes(1);
    });

    it("NETWORK_ERROR: exposes the error and does not navigate", async () => {
      restore = installHttpAdapter((config) => networkError(config));
      const { result } = setup();

      await act(() => result.current.confirm());

      expect(result.current.state).toMatchObject({
        status: "error",
        error: { code: "NETWORK_ERROR" },
      });
      expect(router.push).not.toHaveBeenCalled();
    });

    it("INSUFFICIENT_FUNDS: exposes the error", async () => {
      restore = installHttpAdapter((config) =>
        jsonResponse(config, 422, failure("INSUFFICIENT_FUNDS")),
      );
      const { result } = setup();

      await act(() => result.current.confirm());

      expect(result.current.state).toMatchObject({
        status: "error",
        error: { code: "INSUFFICIENT_FUNDS" },
      });
      expect(router.push).not.toHaveBeenCalled();
    });

    it("TIMEOUT: exposes the error when the client gives up", async () => {
      restore = installHttpAdapter((config) => timeoutError(config));
      const { result } = setup();

      await act(() => result.current.confirm());

      expect(result.current.state).toMatchObject({ status: "error", error: { code: "TIMEOUT" } });
      expect(router.push).not.toHaveBeenCalled();
    });

    it("UNKNOWN_ERROR: exposes the error", async () => {
      restore = installHttpAdapter((config) => jsonResponse(config, 500, failure("UNKNOWN_ERROR")));
      const { result } = setup();

      await act(() => result.current.confirm());

      expect(result.current.state).toMatchObject({
        status: "error",
        error: { code: "UNKNOWN_ERROR" },
      });
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe("request", () => {
    it("posts the draft with an Idempotency-Key and without a forced scenario", async () => {
      const seen: InternalAxiosRequestConfig[] = [];
      restore = installHttpAdapter((config) => {
        seen.push(config);
        return jsonResponse(config, 201, { receipt });
      });
      const { result, store } = setup();

      await act(() => result.current.confirm());

      expect(seen).toHaveLength(1);
      expect(seen[0]?.method).toBe("post");
      expect(seen[0]?.url).toBe("/transactions");
      expect(readBody(seen[0] as InternalAxiosRequestConfig)).toEqual({
        amountCents: 5_000,
        recipient: "Ana García",
      });
      expect(seen[0]?.headers.get("Idempotency-Key")).toBe(
        store.getState().transfer.idempotencyKey,
      );
      expect(seen[0]?.headers.get(SCENARIO_HEADER)).toBeFalsy();
      expect(store.getState().transfer.step).toBe("confirming");
    });

    it("sends x-mock-scenario when the demo scenario is forced", async () => {
      const seen: InternalAxiosRequestConfig[] = [];
      restore = installHttpAdapter((config) => {
        seen.push(config);
        return jsonResponse(config, 201, { receipt });
      });
      const { result, store } = setup();
      act(() => {
        store.dispatch(setDemoScenario("timeout"));
      });

      await act(() => result.current.confirm());

      expect(seen[0]?.headers.get(SCENARIO_HEADER)).toBe("timeout");
    });
  });

  describe("retry", () => {
    it("reuses the same Idempotency-Key as the first attempt", async () => {
      const keys: unknown[] = [];
      restore = installHttpAdapter((config) => {
        keys.push(config.headers.get("Idempotency-Key"));
        return keys.length === 1 ? networkError(config) : jsonResponse(config, 201, { receipt });
      });
      const { result } = setup();

      await act(() => result.current.confirm());
      expect(result.current.state).toMatchObject({ status: "error" });
      await act(() => result.current.retry());

      expect(keys).toHaveLength(2);
      expect(keys[0]).toEqual(expect.any(String));
      expect(keys[1]).toBe(keys[0]);
      expect(result.current.state).toEqual({ status: "success" });
      expect(router.push).toHaveBeenCalledWith("/transfer/receipt/tx-1");
    });

    it("confirm() after a failure also keeps the key", async () => {
      const keys: unknown[] = [];
      restore = installHttpAdapter((config) => {
        keys.push(config.headers.get("Idempotency-Key"));
        return networkError(config);
      });
      const { result } = setup();

      await act(() => result.current.confirm());
      await act(() => result.current.confirm());

      expect(keys[1]).toBe(keys[0]);
    });

    it("clears the previous error while the retry is in flight", async () => {
      let release = () => {};
      let calls = 0;
      restore = installHttpAdapter((config) => {
        calls += 1;
        if (calls === 1) return networkError(config);
        return new Promise((resolve) => {
          release = () =>
            resolve({ data: { receipt }, status: 201, statusText: "", headers: {}, config });
        });
      });
      const { result } = setup();

      await act(() => result.current.confirm());
      let retrying: Promise<void> = Promise.resolve();
      act(() => {
        retrying = result.current.retry();
      });

      await waitFor(() => expect(result.current.state.status).toBe("processing"));
      await act(async () => {
        release();
        await retrying;
      });
      expect(result.current.state).toEqual({ status: "success" });
    });

    it("does nothing without an idempotency key", async () => {
      const seen: unknown[] = [];
      restore = installHttpAdapter((config) => {
        seen.push(config);
        return jsonResponse(config, 201, { receipt });
      });
      const { result } = setup();

      await act(() => result.current.retry());

      expect(seen).toHaveLength(0);
    });
  });

  describe("reset", () => {
    it("goes back to idle after a success, so a new transfer can start", async () => {
      restore = installHttpAdapter((config) => jsonResponse(config, 201, { receipt }));
      const { result } = setup();
      await act(() => result.current.confirm());
      expect(result.current.state).toEqual({ status: "success" });

      act(() => result.current.reset());

      expect(result.current.state).toEqual({ status: "idle" });
    });

    it("clears an error too", async () => {
      restore = installHttpAdapter((config) => networkError(config));
      const { result } = setup();
      await act(() => result.current.confirm());
      expect(result.current.state).toMatchObject({ status: "error" });

      act(() => result.current.reset());

      expect(result.current.state).toEqual({ status: "idle" });
    });
  });

  describe("double submit", () => {
    it("sends a single request when confirm is called twice before the answer", async () => {
      let release = () => {};
      let calls = 0;
      restore = installHttpAdapter(
        (config) =>
          new Promise((resolve) => {
            calls += 1;
            release = () =>
              resolve({ data: { receipt }, status: 201, statusText: "", headers: {}, config });
          }),
      );
      const { result } = setup();

      let first: Promise<void> = Promise.resolve();
      let second: Promise<void> = Promise.resolve();
      act(() => {
        first = result.current.confirm();
        second = result.current.confirm();
      });
      await act(async () => {
        release();
        await Promise.all([first, second]);
      });

      expect(calls).toBe(1);
      expect(router.push).toHaveBeenCalledTimes(1);
    });
  });

  describe("slow request", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("reports slow only after 3 seconds", async () => {
      let release = () => {};
      restore = installHttpAdapter(
        (config) =>
          new Promise((resolve) => {
            release = () =>
              resolve({ data: { receipt }, status: 201, statusText: "", headers: {}, config });
          }),
      );
      const { result } = setup();

      let sending: Promise<void> = Promise.resolve();
      act(() => {
        sending = result.current.confirm();
      });
      expect(result.current.state).toEqual({ status: "processing", slow: false });

      act(() => {
        vi.advanceTimersByTime(SLOW_REQUEST_MS - 1);
      });
      expect(result.current.state).toEqual({ status: "processing", slow: false });

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.state).toEqual({ status: "processing", slow: true });

      await act(async () => {
        release();
        await sending;
      });
      expect(result.current.state).toEqual({ status: "success" });
    });
  });
});
