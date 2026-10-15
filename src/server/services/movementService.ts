import type { ListScenario } from "@/domain/api";
import type { ApiError } from "@/domain/errors";
import { paginate, type Page } from "@/domain/pagination";
import { err, ok, type Result } from "@/domain/result";
import type { Movement } from "@/domain/types";
import { apiError } from "../api-error";
import { largeMovements } from "../large-dataset";
import { listMovements } from "../mock-db";

type ListParams = {
  limit: number;
  cursor?: string | undefined;
  scenario?: ListScenario | null | undefined;
};

// One page of movements, newest first. The API route and the Home page (a Server Component,
// which asks for page 1 directly instead of calling its own API) both use it.
export const list = ({ limit, cursor, scenario }: ListParams): Result<Page<Movement>, ApiError> => {
  if (scenario === "error") {
    return err(apiError("UNKNOWN_ERROR", "Could not load your movements."));
  }
  if (scenario === "empty") return ok({ items: [], nextCursor: null });

  const source = scenario === "large" ? largeMovements() : listMovements();
  const page = paginate(source, { limit, cursor, idOf: (movement) => movement.id });
  if (!page.ok) return err(apiError("VALIDATION_ERROR", "The cursor is not valid."));
  return page;
};
