import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installHttpAdapter, jsonResponse, networkError } from "@/test-utils/http-adapter";
import { makeStore } from "@/store/store";
import { useLogout } from "../hooks/useLogout";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const user = { id: "user-demo", name: "Demo User", email: "demo@example.com" };

function setup() {
  const store = makeStore({ session: { user } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const hook = renderHook(() => useLogout(), { wrapper });
  return { store, ...hook };
}

describe("useLogout", () => {
  let restoreAdapter = () => {};

  beforeEach(() => {
    router.replace.mockClear();
  });

  afterEach(() => {
    restoreAdapter();
  });

  it("posts to /auth/logout, clears the session and redirects to /login", async () => {
    const requests: unknown[] = [];
    restoreAdapter = installHttpAdapter((config) => {
      requests.push({ method: config.method, url: config.url });
      return jsonResponse(config, 200, { ok: true });
    });
    const { store, result } = setup();

    await act(() => result.current.logout());

    expect(requests).toEqual([{ method: "post", url: "/auth/logout" }]);
    expect(store.getState().session.user).toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/login");
    expect(result.current.error).toBeNull();
  });

  it("signs out anyway when the session already expired (401)", async () => {
    restoreAdapter = installHttpAdapter((config) =>
      jsonResponse(config, 401, { error: { code: "UNAUTHORIZED", message: "x" } }),
    );
    const { store, result } = setup();

    await act(() => result.current.logout());

    expect(store.getState().session.user).toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/login");
  });

  it("keeps the session and shows the error on other failures", async () => {
    restoreAdapter = installHttpAdapter((config) => networkError(config));
    const { store, result } = setup();

    await act(() => result.current.logout());

    expect(result.current.error).toMatchObject({ code: "NETWORK_ERROR" });
    expect(store.getState().session.user).toEqual(user);
    expect(router.replace).not.toHaveBeenCalled();
  });
});
