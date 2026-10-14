import type { AccountResponse } from "@/domain/api";
import { jsonOk, unauthorizedResponse } from "@/server/http";
import { getSession } from "@/server/session";
import { getAccount } from "@/server/services/accountService";

export async function GET() {
  if (!(await getSession())) return unauthorizedResponse();

  return jsonOk<AccountResponse>({ account: getAccount() });
}
