import { asCents } from "@/domain/money";
import { sortMovements } from "@/domain/movements";
import { sortContacts } from "@/domain/contacts";
import type { Contact, Movement } from "@/domain/types";

// A big read-only dataset to try pagination and virtualization (?scenario=large).
// It is made from the index only (no Math.random, no Date.now), so it is the same on every
// call and in every test. It is built once and reused.

export const LARGE_MOVEMENTS_COUNT = 10_000;
export const LARGE_CONTACTS_COUNT = 5_000;

const FIRST_NAMES = [
  "Ana",
  "Luis",
  "María",
  "Carlos",
  "Sofía",
  "Jorge",
  "Lucía",
  "Pedro",
  "Valeria",
  "Diego",
  "Camila",
  "Andrés",
  "Fernanda",
  "Ricardo",
  "Paola",
  "Héctor",
  "Daniela",
  "Iván",
  "Renata",
  "Óscar",
];

const LAST_NAMES = [
  "García",
  "Hernández",
  "López",
  "Martínez",
  "González",
  "Pérez",
  "Rodríguez",
  "Sánchez",
  "Ramírez",
  "Flores",
  "Torres",
  "Rivera",
  "Gómez",
  "Díaz",
  "Cruz",
];

// Fixed date (2026-10-13T12:00:00Z), so the generated dates do not depend on today.
const NEWEST_MOVEMENT_MS = Date.UTC(2026, 9, 13, 12, 0, 0);
const MINUTES_BETWEEN_MOVEMENTS = 37;

const padded = (index: number, width: number): string => String(index).padStart(width, "0");

const personName = (index: number): string => {
  const first = FIRST_NAMES[index % FIRST_NAMES.length] ?? "Ana";
  const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length] ?? "García";
  return `${first} ${last}`;
};

const generateMovements = (count: number): Movement[] => {
  const movements: Movement[] = [];
  for (let index = 0; index < count; index += 1) {
    const createdAt = new Date(
      NEWEST_MOVEMENT_MS - index * MINUTES_BETWEEN_MOVEMENTS * 60_000,
    ).toISOString();
    movements.push({
      id: `mov-large-${padded(index, 5)}`,
      type: index % 3 === 0 ? "incoming" : "outgoing",
      amountCents: asCents(((index * 7919) % 99_900) + 100),
      counterpartName: personName(index * 7),
      createdAt,
      status: index % 113 === 0 ? "failed" : index % 47 === 0 ? "pending" : "completed",
    });
  }
  return movements;
};

const generateContacts = (count: number): Contact[] => {
  const contacts: Contact[] = [];
  for (let index = 0; index < count; index += 1) {
    contacts.push({
      id: `contact-large-${padded(index, 4)}`,
      name: personName(index),
      // 10 digits, unique per contact.
      phoneOrEmail: `55${padded(10_000_000 + index * 13, 8)}`,
      isFavorite: index % 40 === 0,
    });
  }
  return contacts;
};

let movements: readonly Movement[] | undefined;
let contacts: readonly Contact[] | undefined;

// Newest first, like the real list.
export const largeMovements = (): readonly Movement[] => {
  movements ??= sortMovements(generateMovements(LARGE_MOVEMENTS_COUNT));
  return movements;
};

// Favorites first, then by name, like the real list.
export const largeContacts = (): readonly Contact[] => {
  contacts ??= sortContacts(generateContacts(LARGE_CONTACTS_COUNT));
  return contacts;
};
