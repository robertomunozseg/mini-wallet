import type { LogoutResponse } from "@/domain/api";
import { jsonOk, unauthorizedResponse } from "@/server/http";
import { clearSession, getSession } from "@/server/session";

export async function POST() {
  if (!(await getSession())) return unauthorizedResponse();

  await clearSession();
  return jsonOk<LogoutResponse>({ ok: true });
}
