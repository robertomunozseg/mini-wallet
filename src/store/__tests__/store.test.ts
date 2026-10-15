import { describe, expect, it } from "vitest";
import type { User } from "@/domain/types";
import reducer, { clear, hydrate, selectUser } from "../slices/sessionSlice";
import { setRecipient } from "../slices/transferSlice";
import { makeStore } from "../store";

describe("makeStore", () => {
  it("creates independent stores (no shared state between requests)", () => {
    const a = makeStore();
    const b = makeStore();

    a.dispatch(hydrate({ id: "user-demo", name: "Demo User", email: "demo@example.com" }));
    a.dispatch(setRecipient("Ana"));

    expect(a).not.toBe(b);
    expect(b.getState().session.user).toBeNull();
    expect(b.getState().transfer.recipient).toBe("");
  });

  it("accepts a preloaded state", () => {
    const store = makeStore({
      session: { user: { id: "user-demo", name: "Demo User", email: "demo@example.com" } },
    });
    expect(store.getState().session.user?.id).toBe("user-demo");
    expect(store.getState().transfer.step).toBe("amount");
  });
});

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

    store.dispatch(hydrate(user));
    expect(selectUser(store.getState())).toEqual(user);

    store.dispatch(clear());
    expect(selectUser(store.getState())).toBeNull();
  });
});
