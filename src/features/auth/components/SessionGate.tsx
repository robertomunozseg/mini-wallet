import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SessionHydrator } from "@/features/auth/components/SessionHydrator";
import { getSession } from "@/server/session";

type SessionGateProps = { children: ReactNode };

// Server Component. Reading the cookie is request-time data, so with Cache Components it must
// render inside a <Suspense> boundary; the layout provides it.
// It also copies the user into the Redux store, so every protected page can show it.
export async function SessionGate({ children }: SessionGateProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <SessionHydrator user={session.user} />
      {children}
    </>
  );
}
