import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/store/store";

// Renders a component inside a fresh Redux store and returns the store to inspect or prepare state.
export function renderWithStore(ui: ReactElement, store = makeStore()) {
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}
