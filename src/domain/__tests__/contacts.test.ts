import { describe, expect, it } from "vitest";
import { filterContacts, groupContacts } from "../contacts";
import type { Contact } from "../types";

const contacts: Contact[] = [
  { id: "1", name: "Carlos Ruiz", phoneOrEmail: "carlos.ruiz@example.com", isFavorite: false },
  { id: "2", name: "María López", phoneOrEmail: "5598765432", isFavorite: true },
  { id: "3", name: "Ana García", phoneOrEmail: "ana.garcia@example.com", isFavorite: true },
  { id: "4", name: "Luis Hernández", phoneOrEmail: "5512345678", isFavorite: true },
  { id: "5", name: "Beto Díaz", phoneOrEmail: "5511112222", isFavorite: false },
];

function names(list: Contact[]): string[] {
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

describe("groupContacts", () => {
  it("puts favorites first, each group sorted by name", () => {
    const { favorites, others } = groupContacts(contacts);
    expect(names(favorites)).toEqual(["Ana García", "Luis Hernández", "María López"]);
    expect(names(others)).toEqual(["Beto Díaz", "Carlos Ruiz"]);
  });

  it("applies the search query to both groups", () => {
    const { favorites, others } = groupContacts(contacts, "r");
    expect(names(favorites)).toEqual(["Ana García", "Luis Hernández", "María López"]);
    expect(names(others)).toEqual(["Carlos Ruiz"]);
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
