import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import type { User } from "@/domain/types";
import { makeStore } from "@/store/store";
import { SessionHydrator } from "../components/SessionHydrator";

const user: User = { id: "user-demo", name: "Demo User", email: "demo@example.com" };

describe("SessionHydrator", () => {
  it("copies the user into the session store", () => {
    const store = makeStore();
    expect(store.getState().session.user).toBeNull();

    render(
      <Provider store={store}>
        <SessionHydrator user={user} />
      </Provider>,
    );

    expect(store.getState().session.user).toEqual(user);
  });

  it("renders nothing", () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <SessionHydrator user={user} />
      </Provider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
