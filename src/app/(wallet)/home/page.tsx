import { redirect } from "next/navigation";
import { parseMovementsScenario } from "@/domain/api";
import { SessionHydrator } from "@/features/auth/components/SessionHydrator";
import { BalanceCard } from "@/features/home/components/BalanceCard";
import { MovementsList } from "@/features/home/components/MovementsList";
import { getSession } from "@/server/session";
import { getAccount } from "@/server/services/accountService";

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  if (!session) redirect("/login");

  // Server Components call the services directly: no fetch to our own API.
  const account = getAccount();

  // ?scenario=empty|error forces those states in the movements list (forwarded as a header).
  const { scenario } = params;
  const movementsScenario = parseMovementsScenario(typeof scenario === "string" ? scenario : null);

  return (
    <main>
      <SessionHydrator user={session.user} />
      <h1 className="mb-4 text-2xl font-semibold text-zinc-900">Home</h1>
      <div className="grid gap-6 md:grid-cols-[2fr_3fr] md:items-start">
        <BalanceCard name={session.user.name} balanceCents={account.balanceCents} />
        <MovementsList scenario={movementsScenario ?? undefined} />
      </div>
    </main>
  );
}
