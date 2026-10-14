import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { parseListScenario } from "@/domain/api";
import { SessionHydrator } from "@/features/auth/components/SessionHydrator";
import { BalanceCard } from "@/features/home/components/BalanceCard";
import { MovementsSection } from "@/features/home/components/MovementsSection";
import { MovementsSkeleton } from "@/features/home/components/MovementsSkeleton";
import { getSession } from "@/server/session";
import { getAccount } from "@/server/services/accountService";

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  if (!session) redirect("/login");

  // Server Components call the services directly: no fetch to our own API.
  const account = getAccount();

  // ?scenario=empty|error|large forces those states in the movements list.
  const { scenario } = params;
  const movementsScenario = parseListScenario(typeof scenario === "string" ? scenario : null);

  return (
    <main>
      <SessionHydrator user={session.user} />
      <h1 className="mb-4 text-2xl font-semibold text-zinc-900">Home</h1>
      <div className="grid gap-6 md:grid-cols-[2fr_3fr] md:items-start">
        <BalanceCard name={session.user.name} balanceCents={account.balanceCents} />
        {/* The movements stream in when ready, so the balance is not held back by them. */}
        <Suspense
          fallback={
            <Card>
              <h2 className="mb-2 text-lg font-semibold text-zinc-900">Recent movements</h2>
              <MovementsSkeleton />
            </Card>
          }
        >
          <MovementsSection scenario={movementsScenario ?? undefined} />
        </Suspense>
      </div>
    </main>
  );
}
