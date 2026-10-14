import { act, renderHook } from "@testing-library/react";
import type { AxiosResponse } from "axios";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  installHttpAdapter,
  jsonResponse,
  networkError,
  readBody,
  timeoutError,
} from "@/test-utils/http-adapter";
import { makeStore } from "@/store/store";
import { useLogin } from "../hooks/useLogin";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const user = { id: "user-demo", name: "Demo User", email: "demo@example.com" };

function setup() {
  const store = makeStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const hook = renderHook(() => useLogin(), { wrapper });
  return { store, ...hook };
}

describe("useLogin", () => {
  let restoreAdapter = () => {};

  beforeEach(() => {
    router.replace.mockClear();
  });

  afterEach(() => {
    restoreAdapter();
  });

  it("posts the identifier, hydrates the session and redirects to /home", async () => {
    const requests: unknown[] = [];
    restoreAdapter = installHttpAdapter((config) => {
      requests.push({ method: config.method, url: config.url, body: readBody(config) });
      return jsonResponse(config, 200, { user });
    });
    const { store, result } = setup();

    await act(() => result.current.login("ana@example.com"));

    expect(requests).toEqual([
      { method: "post", url: "/auth/login", body: { identifier: "ana@example.com" } },
    ]);
    expect(store.getState().session.user).toEqual(user);
    expect(router.replace).toHaveBeenCalledWith("/home");
    expect(result.current.error).toBeNull();
  });

  it("is loading while the request is in flight", async () => {
    let finish: (response: AxiosResponse) => void = () => {};
    restoreAdapter = installHttpAdapter(
      () =>
        new Promise<AxiosResponse>((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = setup();
    expect(result.current.isLoading).toBe(false);

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.login("5512345678");
    });
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      finish({
        data: { user },
        status: 200,
        statusText: "",
        headers: {},
        config: { headers: {} } as never,
      });
      await pending;
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("exposes INVALID_CREDENTIALS and does not redirect or hydrate", async () => {
    restoreAdapter = installHttpAdapter((config) =>
      jsonResponse(config, 401, {
        error: { code: "INVALID_CREDENTIALS", message: "server text" },
      }),
    );
    const { store, result } = setup();

    await act(() => result.current.login("fail@test.com"));

    expect(result.current.error).toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(result.current.isLoading).toBe(false);
    expect(store.getState().session.user).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("exposes NETWORK_ERROR when the server is unreachable", async () => {
    restoreAdapter = installHttpAdapter((config) => networkError(config));
    const { result } = setup();

    await act(() => result.current.login("ana@example.com"));

    expect(result.current.error).toMatchObject({ code: "NETWORK_ERROR" });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("exposes TIMEOUT when the request is aborted by the timeout", async () => {
    restoreAdapter = installHttpAdapter((config) => timeoutError(config));
    const { result } = setup();

    await act(() => result.current.login("ana@example.com"));

    expect(result.current.error).toMatchObject({ code: "TIMEOUT" });
  });

  it("clears the previous error when the user tries again", async () => {
    let attempt = 0;
    restoreAdapter = installHttpAdapter((config) => {
      attempt += 1;
      return attempt === 1 ? networkError(config) : jsonResponse(config, 200, { user });
    });
    const { result } = setup();

    await act(() => result.current.login("ana@example.com"));
    expect(result.current.error).not.toBeNull();

    await act(() => result.current.login("ana@example.com"));
    expect(result.current.error).toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/home");
  });
});
