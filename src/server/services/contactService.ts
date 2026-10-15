import type { ListScenario } from "@/domain/api";
import { filterContacts, sortContacts } from "@/domain/contacts";
import type { ApiError } from "@/domain/errors";
import { paginate, type Page } from "@/domain/pagination";
import { err, ok, type Result } from "@/domain/result";
import { newContactSchema } from "@/domain/schemas";
import type { Contact } from "@/domain/types";
import { apiError, validationError } from "../api-error";
import { largeContacts } from "../large-dataset";
import { addContact, listContacts } from "../mock-db";

type ListParams = {
  q?: string | undefined;
  limit: number;
  cursor?: string | undefined;
  scenario?: ListScenario | null | undefined;
};

// One page of contacts that match the search: favorites first, then by name. Searching on the
// server keeps the response small however big the address book is.
export const list = ({
  q = "",
  limit,
  cursor,
  scenario,
}: ListParams): Result<Page<Contact>, ApiError> => {
  // The large dataset is already sorted; the real list is small, so it is sorted on each request.
  const source = scenario === "large" ? largeContacts() : sortContacts(listContacts());
  const page = paginate(filterContacts(source, q), {
    limit,
    cursor,
    idOf: (contact) => contact.id,
  });
  if (!page.ok) return err(apiError("VALIDATION_ERROR", "The cursor is not valid."));
  return page;
};

const normalize = (phoneOrEmail: string): string => phoneOrEmail.trim().toLowerCase();

export const create = (
  input: unknown,
  newId: () => string = () => crypto.randomUUID(),
): Result<Contact, ApiError> => {
  const parsed = newContactSchema.safeParse(input);
  if (!parsed.success) return err(validationError(parsed.error));

  const isDuplicate = listContacts().some(
    (contact) => normalize(contact.phoneOrEmail) === normalize(parsed.data.phoneOrEmail),
  );
  if (isDuplicate) {
    return err(apiError("VALIDATION_ERROR", "A contact with this phone or email already exists."));
  }

  const contact: Contact = { id: newId(), ...parsed.data };
  addContact(contact);
  return ok(contact);
};
