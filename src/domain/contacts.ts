import type { Contact } from "./types";

// Lowercase and without accents, so "garcia" finds "García".
// NFD splits "í" into "i" plus a mark, and \p{M} matches those marks.
const normalize = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

export const filterContacts = (contacts: readonly Contact[], query: string): Contact[] => {
  const search = normalize(query);
  if (search === "") return [...contacts];

  return contacts.filter(
    (contact) =>
      normalize(contact.name).includes(search) || normalize(contact.phoneOrEmail).includes(search),
  );
};

// What contacts are sorted by. The pagination cursor stores it, so it is plain data.
type ContactKey = { isFavorite: boolean; name: string; id: string };

export const contactKey = (contact: Contact): ContactKey => ({
  isFavorite: contact.isFavorite,
  name: normalize(contact.name),
  id: contact.id,
});

export const isContactKey = (value: unknown): value is ContactKey =>
  typeof value === "object" &&
  value !== null &&
  "isFavorite" in value &&
  typeof value.isFavorite === "boolean" &&
  "name" in value &&
  typeof value.name === "string" &&
  "id" in value &&
  typeof value.id === "string";

// Favorites first, then by name, then by id. The id breaks ties, so two contacts are never equal
// and the cursor always points to exactly one place.
const compareContactKeys = (a: ContactKey, b: ContactKey): number => {
  if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
};

export const sortContacts = (contacts: readonly Contact[]): Contact[] =>
  [...contacts].sort((a, b) => compareContactKeys(contactKey(a), contactKey(b)));

// True when the contact comes after the cursor in the sort order.
export const isContactAfter = (contact: Contact, key: ContactKey): boolean =>
  compareContactKeys(contactKey(contact), key) > 0;

// Splits a sorted list into favorites and the rest, keeping the order.
export const groupContacts = (
  contacts: readonly Contact[],
): { favorites: Contact[]; others: Contact[] } => ({
  favorites: contacts.filter((contact) => contact.isFavorite),
  others: contacts.filter((contact) => !contact.isFavorite),
});
