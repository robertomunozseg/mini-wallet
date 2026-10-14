import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/server/session";

type SessionGateProps = { children: ReactNode };

// Server Component. Reading the cookie is request-time data, so with Cache Components it must
// render inside a <Suspense> boundary; the layout provides it.
export async function SessionGate({ children }: SessionGateProps) {
  if (!(await getSession())) redirect("/login");
  return children;
}
