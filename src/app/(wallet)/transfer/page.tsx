import { redirect } from "next/navigation";
import { TransferFlow } from "@/features/transfer/components/TransferFlow";
import { getSession } from "@/server/session";
import { getAccount } from "@/server/services/accountService";

export default async function TransferPage() {
  // Reading the session makes the page dynamic: without it the balance would be frozen at build.
  if (!(await getSession())) redirect("/login");

  // Server Components call the services directly: no fetch to our own API.
  const account = getAccount();

  return (
    <main className="mx-auto w-full max-w-xl">
      <h1 className="mb-4 text-2xl font-semibold text-zinc-900">New transfer</h1>
      <TransferFlow balanceCents={account.balanceCents} />
    </main>
  );
}
