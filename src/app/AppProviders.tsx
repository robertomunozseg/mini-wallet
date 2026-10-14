"use client";

import type { ReactNode } from "react";
// Imported for its side effect: configures axios-hooks (shared axios instance, no cache).
import "@/lib/http";
import { StoreProvider } from "@/store/StoreProvider";

type AppProvidersProps = { children: ReactNode };

export function AppProviders({ children }: AppProvidersProps) {
  return <StoreProvider>{children}</StoreProvider>;
}
