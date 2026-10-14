import type { Contact } from "./types";

// Lowercase and without accents, so "garcia" finds "García".
// NFD splits "í" into "i" + a combining mark; \p{M} matches those marks.
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export function filterContacts(contacts: readonly Contact[], query: string): Contact[] {
  const search = normalize(query);
  if (search === "") return [...contacts];
  return contacts.filter(
    (contact) =>
      normalize(contact.name).includes(search) || normalize(contact.phoneOrEmail).includes(search),
  );
}

// What a contact is sorted by. Pagination cursors store it, so it must be plain data.
type ContactKey = { isFavorite: boolean; name: string; id: string };

export function contactKey(contact: Contact): ContactKey {
  return { isFavorite: contact.isFavorite, name: normalize(contact.name), id: contact.id };
}

export function isContactKey(value: unknown): value is ContactKey {
  return (
    typeof value === "object" &&
    value !== null &&
    "isFavorite" in value &&
    typeof value.isFavorite === "boolean" &&
    "name" in value &&
    typeof value.name === "string" &&
    "id" in value &&
    typeof value.id === "string"
  );
}

// Favorites first, then by name, then by id. The id makes the order total, which keyset
// pagination needs: two different contacts never compare as equal.
function compareContactKeys(a: ContactKey, b: ContactKey): number {
  if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

export function sortContacts(contacts: readonly Contact[]): Contact[] {
  return [...contacts].sort((a, b) => compareContactKeys(contactKey(a), contactKey(b)));
}

// True when `contact` comes after the cursor position in the sort order.
export function isContactAfter(contact: Contact, key: ContactKey): boolean {
  return compareContactKeys(contactKey(contact), key) > 0;
}

// Splits an already sorted list into favorites and the rest, keeping the order.
export function groupContacts(contacts: readonly Contact[]): {
  favorites: Contact[];
  others: Contact[];
} {
  return {
    favorites: contacts.filter((contact) => contact.isFavorite),
    others: contacts.filter((contact) => !contact.isFavorite),
  };
}
