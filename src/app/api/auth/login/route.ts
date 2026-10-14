import type { LoginResponse } from "@/domain/api";
import { loginSchema } from "@/domain/schemas";
import { jsonError, jsonOk, readJsonBody, validationErrorResponse } from "@/server/http";
import { createSession } from "@/server/session";
import { sleep } from "@/server/sleep";
import { login } from "@/server/services/authService";

// Simulated latency so the UI loading state is visible, as with a real auth provider.
const LOGIN_DELAY_MS = 600;

export async function POST(request: Request) {
  await sleep(LOGIN_DELAY_MS);

  const parsed = loginSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const result = login(parsed.data.identifier);
  if (!result.ok) return jsonError(result.error);

  await createSession();
  return jsonOk<LoginResponse>({ user: result.value });
}
