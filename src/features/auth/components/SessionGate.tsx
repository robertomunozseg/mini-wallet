import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SessionHydrator } from "@/features/auth/components/SessionHydrator";
import { getSession } from "@/server/session";

type SessionGateProps = { children: ReactNode };

// Server Component: it reads the session cookie, which with Cache Components has to happen
// inside <Suspense> (the layout has one). It also puts the user in the Redux store.
export const SessionGate = async ({ children }: SessionGateProps) => {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <SessionHydrator user={session.user} />
      {children}
    </>
  );
};
