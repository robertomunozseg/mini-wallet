"use client";

import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";
// Imported for its side effect: configures axios-hooks (shared axios instance, no cache).
import "@/lib/http";
import { makeStore } from "@/store/store";

type AppProvidersProps = { children: ReactNode };

export const AppProviders = ({ children }: AppProvidersProps) => {
  // useState runs the initializer once, so each render tree gets its own store (a store created
  // at module level would be shared by every user on the server).
  const [store] = useState(() => makeStore());

  return <Provider store={store}>{children}</Provider>;
};
