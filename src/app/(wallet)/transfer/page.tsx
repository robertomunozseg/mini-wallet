import { redirect } from "next/navigation";
import { parseListScenario } from "@/domain/api";
import { TransferFlow } from "@/features/transfer/components/TransferFlow";
import { getSession } from "@/server/session";
import { getAccount } from "@/server/services/accountService";

export default async function TransferPage({ searchParams }: PageProps<"/transfer">) {
  // Reading the session makes the page dynamic: without it the balance would be frozen at build.
  const [session, params] = await Promise.all([getSession(), searchParams]);
  if (!session) redirect("/login");

  // Server Components call the services directly: no fetch to our own API.
  const account = getAccount();

  // ?scenario=large searches a big generated address book (only "large" affects contacts).
  const scenario = parseListScenario(typeof params.scenario === "string" ? params.scenario : null);

  return (
    <main className="mx-auto w-full max-w-xl">
      <h1 className="mb-4 text-2xl font-semibold text-zinc-900">New transfer</h1>
      <TransferFlow
        balanceCents={account.balanceCents}
        scenario={scenario === "large" ? scenario : undefined}
      />
    </main>
  );
}
