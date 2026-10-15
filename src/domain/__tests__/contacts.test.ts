import { describe, expect, it } from "vitest";
import { filterContacts, groupContacts, sortContacts } from "../contacts";
import type { Contact } from "../types";

const contacts: Contact[] = [
  { id: "1", name: "Carlos Ruiz", phoneOrEmail: "carlos.ruiz@example.com", isFavorite: false },
  { id: "2", name: "María López", phoneOrEmail: "5598765432", isFavorite: true },
  { id: "3", name: "Ana García", phoneOrEmail: "ana.garcia@example.com", isFavorite: true },
  { id: "4", name: "Luis Hernández", phoneOrEmail: "5512345678", isFavorite: true },
  { id: "5", name: "Beto Díaz", phoneOrEmail: "5511112222", isFavorite: false },
];

function names(list: readonly Contact[]): string[] {
  return list.map((contact) => contact.name);
}

describe("filterContacts", () => {
  it("returns every contact for an empty or blank query", () => {
    expect(filterContacts(contacts, "")).toEqual(contacts);
    expect(filterContacts(contacts, "   ")).toEqual(contacts);
  });

  it("matches by name, ignoring case", () => {
    expect(names(filterContacts(contacts, "ANA"))).toEqual(["Ana García"]);
  });

  it("ignores accents in both the query and the data", () => {
    expect(names(filterContacts(contacts, "garcia"))).toEqual(["Ana García"]);
    expect(names(filterContacts(contacts, "maría"))).toEqual(["María López"]);
    expect(names(filterContacts(contacts, "hernandez"))).toEqual(["Luis Hernández"]);
  });

  it("matches by phone or email", () => {
    expect(names(filterContacts(contacts, "5598"))).toEqual(["María López"]);
    expect(names(filterContacts(contacts, "carlos.ruiz@"))).toEqual(["Carlos Ruiz"]);
  });

  it("trims the query", () => {
    expect(names(filterContacts(contacts, "  luis  "))).toEqual(["Luis Hernández"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterContacts(contacts, "zzz")).toEqual([]);
  });

  it("does not change the original list", () => {
    const copy = [...contacts];
    filterContacts(contacts, "ana");
    expect(contacts).toEqual(copy);
  });
});

describe("sortContacts", () => {
  it("puts favorites first, each group sorted by name", () => {
    expect(names(sortContacts(contacts))).toEqual([
      "Ana García",
      "Luis Hernández",
      "María López",
      "Beto Díaz",
      "Carlos Ruiz",
    ]);
  });

  it("sorts ignoring accents and case", () => {
    const sorted = sortContacts([
      { id: "1", name: "Óscar", phoneOrEmail: "5511110001", isFavorite: false },
      { id: "2", name: "oliver", phoneOrEmail: "5511110002", isFavorite: false },
      { id: "3", name: "Álvaro", phoneOrEmail: "5511110003", isFavorite: false },
    ]);
    expect(names(sorted)).toEqual(["Álvaro", "oliver", "Óscar"]);
  });

  it("breaks ties between equal names by id, so the order is total", () => {
    const sorted = sortContacts([
      { id: "b", name: "Sam", phoneOrEmail: "5511110001", isFavorite: false },
      { id: "a", name: "Sam", phoneOrEmail: "5511110002", isFavorite: false },
    ]);
    expect(sorted.map((contact) => contact.id)).toEqual(["a", "b"]);
  });

  it("does not change the original array", () => {
    const original = [...contacts];
    sortContacts(contacts);
    expect(contacts).toEqual(original);
  });
});

describe("groupContacts", () => {
  it("splits a sorted list in favorites and the rest, keeping the order", () => {
    const { favorites, others } = groupContacts(sortContacts(contacts));
    expect(names(favorites)).toEqual(["Ana García", "Luis Hernández", "María López"]);
    expect(names(others)).toEqual(["Beto Díaz", "Carlos Ruiz"]);
  });

  it("returns empty groups for no contacts", () => {
    expect(groupContacts([])).toEqual({ favorites: [], others: [] });
  });

  it("does not change the original order", () => {
    const original = names(contacts);
    groupContacts(contacts);
    expect(names(contacts)).toEqual(original);
  });
});
