"use client";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import type { ListScenario } from "@/domain/api";
import type { Page } from "@/domain/pagination";
import type { Movement } from "@/domain/types";
import { useMovements } from "../hooks/useMovements";
import { MovementsSkeleton } from "./MovementsSkeleton";
import { VirtualMovementList } from "./VirtualMovementList";

type MovementsListProps = {
  scenario?: ListScenario;
  // First page, already loaded by the server so the list does not start with a request.
  initialPage?: Page<Movement>;
};

const MovementsBody = ({ scenario, initialPage }: MovementsListProps) => {
  const list = useMovements(scenario, initialPage);

  if (list.isLoading && list.items.length === 0) return <MovementsSkeleton />;

  if (list.error) {
    return (
      <ErrorState
        title="We couldn't load your movements"
        message={list.error.message}
        onRetry={list.refetch}
      />
    );
  }

  if (list.items.length === 0) {
    return (
      <EmptyState
        title="No movements yet"
        description="Your transfers and deposits will show up here."
      />
    );
  }

  return (
    <VirtualMovementList
      movements={list.items}
      hasMore={list.hasMore}
      isLoadingMore={list.isLoadingMore}
      loadMoreError={list.loadMoreError}
      loadMore={list.loadMore}
    />
  );
};
export const MovementsList = ({ scenario, initialPage }: MovementsListProps) => {
  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold text-zinc-900">Recent movements</h2>
      <MovementsBody scenario={scenario} initialPage={initialPage} />
    </Card>
  );
};
