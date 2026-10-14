"use client";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { MovementsScenario } from "@/domain/api";
import { useMovements } from "../hooks/useMovements";
import { MovementItem } from "./MovementItem";

type MovementsListProps = { scenario?: MovementsScenario };

const SKELETON_ROWS = 5;

function MovementsBody({ scenario }: MovementsListProps) {
  const { movements, isLoading, error, refetch } = useMovements(scenario);

  if (isLoading) {
    return (
      <div role="status">
        <span className="sr-only">Loading movements</span>
        <div className="divide-y divide-zinc-100">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <div key={index} className="flex items-center gap-3 py-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="We couldn't load your movements"
        message={error.message}
        onRetry={refetch}
      />
    );
  }

  if (!movements || movements.length === 0) {
    return (
      <EmptyState
        title="No movements yet"
        description="Your transfers and deposits will show up here."
      />
    );
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {movements.map((movement) => (
        <MovementItem key={movement.id} movement={movement} />
      ))}
    </ul>
  );
}

export function MovementsList({ scenario }: MovementsListProps) {
  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold text-zinc-900">Recent movements</h2>
      <MovementsBody scenario={scenario} />
    </Card>
  );
}
