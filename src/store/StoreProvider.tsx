"use client";

import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore, type RootState } from "./store";

type StoreProviderProps = {
  children: ReactNode;
  preloadedState?: Partial<RootState>;
};

export function StoreProvider({ children, preloadedState }: StoreProviderProps) {
  // The initializer runs once per mounted provider, so each request/render tree gets its own store.
  // (useRef would work too, but the react-hooks lint rule forbids reading refs during render.)
  const [store] = useState(() => makeStore(preloadedState));

  return <Provider store={store}>{children}</Provider>;
}
