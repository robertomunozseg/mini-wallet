import type { MovementsResponse } from "@/domain/api";
import { movementsQuerySchema } from "@/domain/schemas";
import { jsonError, jsonOk, unauthorizedResponse, validationErrorResponse } from "@/server/http";
import { resolveListScenario } from "@/server/scenario";
import { getSession } from "@/server/session";
import { list } from "@/server/services/movementService";

// GET /api/movements?limit=20&cursor=...
// x-mock-scenario: "empty", "error" and "large" let the UI show those states.
export async function GET(request: Request) {
  if (!(await getSession())) return unauthorizedResponse();

  const query = movementsQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success) return validationErrorResponse(query.error);

  const result = list({ ...query.data, scenario: resolveListScenario(request) });
  if (!result.ok) return jsonError(result.error);

  return jsonOk<MovementsResponse>({
    movements: result.value.items,
    nextCursor: result.value.nextCursor,
  });
}
