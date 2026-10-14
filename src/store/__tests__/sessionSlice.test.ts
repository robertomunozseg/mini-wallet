import { describe, expect, it } from "vitest";
import type { User } from "@/domain/types";
import reducer, { clear, hydrate, selectIsAuthenticated, selectUser } from "../slices/sessionSlice";
import { makeStore } from "../store";

const user: User = { id: "user-demo", name: "Demo User", email: "demo@example.com" };

describe("sessionSlice reducer", () => {
  it("starts without a user", () => {
    expect(reducer(undefined, { type: "@@init" })).toEqual({ user: null });
  });

  it("hydrate stores the user", () => {
    expect(reducer({ user: null }, hydrate(user))).toEqual({ user });
  });

  it("clear removes the user", () => {
    expect(reducer({ user }, clear())).toEqual({ user: null });
  });
});

describe("sessionSlice selectors", () => {
  it("reflect the session in the store", () => {
    const store = makeStore();
    expect(selectUser(store.getState())).toBeNull();
    expect(selectIsAuthenticated(store.getState())).toBe(false);

    store.dispatch(hydrate(user));
    expect(selectUser(store.getState())).toEqual(user);
    expect(selectIsAuthenticated(store.getState())).toBe(true);

    store.dispatch(clear());
    expect(selectIsAuthenticated(store.getState())).toBe(false);
  });
});
