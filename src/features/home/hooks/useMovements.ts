"use client";

import useAxios from "axios-hooks";
import { useCallback, useMemo } from "react";
import { SCENARIO_HEADER, type MovementsResponse, type MovementsScenario } from "@/domain/api";
import type { ApiError, ApiErrorBody } from "@/domain/errors";
import type { Movement } from "@/domain/types";
import { mapApiError } from "@/lib/map-api-error";

type UseMovementsResult = {
  movements: Movement[] | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => void;
};

// Fetches on mount. `scenario` is forwarded as x-mock-scenario to force the empty/error states.
export function useMovements(scenario?: MovementsScenario): UseMovementsResult {
  const [{ data, loading, error }, execute] = useAxios<MovementsResponse, undefined, ApiErrorBody>(
    {
      url: "/movements",
      headers: scenario ? { [SCENARIO_HEADER]: scenario } : undefined,
    },
    // ssr: false because the relative baseURL cannot be requested while pre-rendering on the server.
    { useCache: false, ssr: false },
  );

  const refetch = useCallback(() => {
    execute().catch(() => {
      // The failure is exposed through `error`.
    });
  }, [execute]);

  const apiError = useMemo(() => (error ? mapApiError(error) : null), [error]);

  return { movements: data?.movements ?? null, isLoading: loading, error: apiError, refetch };
}
