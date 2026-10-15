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

// Favorites first, then by name, then by id. The id breaks ties, so the order is always the same.
export const sortContacts = (contacts: readonly Contact[]): Contact[] =>
  [...contacts].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    const nameA = normalize(a.name);
    const nameB = normalize(b.name);
    if (nameA !== nameB) return nameA < nameB ? -1 : 1;
    if (a.id !== b.id) return a.id < b.id ? -1 : 1;
    return 0;
  });

// Splits a sorted list into favorites and the rest, keeping the order.
export const groupContacts = (
  contacts: readonly Contact[],
): { favorites: Contact[]; others: Contact[] } => ({
  favorites: contacts.filter((contact) => contact.isFavorite),
  others: contacts.filter((contact) => !contact.isFavorite),
});
