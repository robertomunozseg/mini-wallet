import { describe, expect, it } from "vitest";
import { hydrate } from "../slices/sessionSlice";
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
