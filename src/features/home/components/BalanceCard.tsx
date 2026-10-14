import { useId } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/domain/money";
import type { Cents } from "@/domain/types";

type BalanceCardProps = {
  name: string;
  balanceCents: Cents;
};

export function BalanceCard({ name, balanceCents }: BalanceCardProps) {
  const headingId = useId();

  return (
    // A named group, so the balance can be found by role and name (screen readers and e2e tests).
    <Card role="group" aria-labelledby={headingId}>
      <p className="text-sm text-zinc-600">Welcome back, {name}</p>
      <h2 id={headingId} className="mt-4 text-sm font-medium text-zinc-600">
        Available balance
      </h2>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-900">
        {formatMoney(balanceCents)}
      </p>
      <ButtonLink href="/transfer" className="mt-6 w-full sm:w-auto">
        New transfer
      </ButtonLink>
    </Card>
  );
}
