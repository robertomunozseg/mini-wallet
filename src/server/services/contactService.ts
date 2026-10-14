import type { ApiError } from "@/domain/errors";
import { err, ok, type Result } from "@/domain/result";
import { newContactSchema } from "@/domain/schemas";
import type { Contact } from "@/domain/types";
import { apiError, validationError } from "../api-error";
import { addContact, listContacts } from "../mock-db";

export function list(): Contact[] {
  return listContacts();
}

function normalize(phoneOrEmail: string): string {
  return phoneOrEmail.trim().toLowerCase();
}

export function create(
  input: unknown,
  newId: () => string = () => crypto.randomUUID(),
): Result<Contact, ApiError> {
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
}
