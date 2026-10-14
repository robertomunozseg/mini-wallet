import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import type { User } from "@/domain/types";
import { hydrate } from "@/store/slices/sessionSlice";
import { makeStore } from "@/store/store";
import { CurrentUser } from "../components/CurrentUser";

const user: User = { id: "user-demo", name: "Demo User", email: "demo@example.com" };

describe("CurrentUser", () => {
  it("shows the name of the signed-in user", () => {
    const store = makeStore();
    store.dispatch(hydrate(user));
    render(
      <Provider store={store}>
        <CurrentUser />
      </Provider>,
    );

    expect(screen.getByText("Demo User")).toBeInTheDocument();
  });

  it("renders nothing until the session is in the store", () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <CurrentUser />
      </Provider>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
