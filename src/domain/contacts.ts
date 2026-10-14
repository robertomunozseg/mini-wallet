import type { Contact } from "./types";

// Lowercase and without accents, so "garcia" finds "García".
// NFD splits "í" into "i" + a combining mark; \p{M} matches those marks.
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

export function filterContacts(contacts: Contact[], query: string): Contact[] {
  const search = normalize(query);
  if (search === "") return contacts;
  return contacts.filter(
    (contact) =>
      normalize(contact.name).includes(search) || normalize(contact.phoneOrEmail).includes(search),
  );
}

function byName(a: Contact, b: Contact): number {
  return a.name.localeCompare(b.name);
}

// Favorites first, each group sorted by name. Applies the search query before grouping.
export function groupContacts(
  contacts: Contact[],
  query = "",
): { favorites: Contact[]; others: Contact[] } {
  const matches = filterContacts(contacts, query);
  return {
    favorites: matches.filter((contact) => contact.isFavorite).sort(byName),
    others: matches.filter((contact) => !contact.isFavorite).sort(byName),
  };
}
