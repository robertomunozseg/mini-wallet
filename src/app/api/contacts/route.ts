import type { ContactResponse, ContactsResponse } from "@/domain/api";
import { jsonError, jsonOk, readJsonBody, unauthorizedResponse } from "@/server/http";
import { getSession } from "@/server/session";
import { create, list } from "@/server/services/contactService";

export async function GET() {
  if (!(await getSession())) return unauthorizedResponse();

  return jsonOk<ContactsResponse>({ contacts: list() });
}

export async function POST(request: Request) {
  if (!(await getSession())) return unauthorizedResponse();

  const result = create(await readJsonBody(request));
  if (!result.ok) return jsonError(result.error);

  return jsonOk<ContactResponse>({ contact: result.value }, 201);
}
