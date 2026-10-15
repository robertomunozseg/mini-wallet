import { describe, expect, it } from "vitest";
import type { User } from "@/domain/types";
import reducer, { hydrate } from "../slices/sessionSlice";
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
});

const user: User = { id: "user-demo", name: "Demo User", email: "demo@example.com" };

describe("sessionSlice reducer", () => {
  it("hydrate stores the user", () => {
    expect(reducer({ user: null }, hydrate(user))).toEqual({ user });
  });
});
