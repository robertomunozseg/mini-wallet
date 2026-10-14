import type { MovementsResponse } from "@/domain/api";
import { apiError } from "@/server/api-error";
import { jsonError, jsonOk, unauthorizedResponse } from "@/server/http";
import { resolveMovementsScenario } from "@/server/scenario";
import { getSession } from "@/server/session";
import { list } from "@/server/services/movementService";

export async function GET(request: Request) {
  if (!(await getSession())) return unauthorizedResponse();

  // x-mock-scenario: "empty" and "error" let the UI show its empty and error states.
  const scenario = resolveMovementsScenario(request);
  if (scenario === "error") {
    return jsonError(apiError("UNKNOWN_ERROR", "Could not load your movements."));
  }
  if (scenario === "empty") return jsonOk<MovementsResponse>({ movements: [] });

  return jsonOk<MovementsResponse>({ movements: list() });
}
