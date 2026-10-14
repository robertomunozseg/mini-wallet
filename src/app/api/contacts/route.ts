import type { ContactResponse, ContactsResponse } from "@/domain/api";
import { contactsQuerySchema } from "@/domain/schemas";
import {
  jsonError,
  jsonOk,
  readJsonBody,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/server/http";
import { resolveListScenario } from "@/server/scenario";
import { getSession } from "@/server/session";
import { create, list } from "@/server/services/contactService";

// GET /api/contacts?q=ana&limit=20&cursor=...
export async function GET(request: Request) {
  if (!(await getSession())) return unauthorizedResponse();

  const query = contactsQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success) return validationErrorResponse(query.error);

  const result = list({ ...query.data, scenario: resolveListScenario(request) });
  if (!result.ok) return jsonError(result.error);

  return jsonOk<ContactsResponse>({
    contacts: result.value.items,
    nextCursor: result.value.nextCursor,
  });
}

export async function POST(request: Request) {
  if (!(await getSession())) return unauthorizedResponse();

  const result = create(await readJsonBody(request));
  if (!result.ok) return jsonError(result.error);

  return jsonOk<ContactResponse>({ contact: result.value }, 201);
}
