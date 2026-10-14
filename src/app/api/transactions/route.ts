import type { TransactionResponse } from "@/domain/api";
import { transferRequestSchema } from "@/domain/schemas";
import { apiError } from "@/server/api-error";
import {
  jsonError,
  jsonOk,
  readJsonBody,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/server/http";
import { resolveScenario } from "@/server/scenario";
import { getSession } from "@/server/session";
import { transactionService } from "@/server/services/transactionService";

// The "timeout" scenario waits 10s before answering, so the function must be allowed to run longer.
export const maxDuration = 15;

const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

export async function POST(request: Request) {
  if (!(await getSession())) return unauthorizedResponse();

  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey || idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    return jsonError(apiError("VALIDATION_ERROR", "A valid Idempotency-Key header is required."));
  }

  const parsed = transferRequestSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const result = await transactionService.create(
    parsed.data,
    idempotencyKey,
    resolveScenario(request),
  );
  if (!result.ok) return jsonError(result.error);

  return jsonOk<TransactionResponse>({ receipt: result.value }, 201);
}
