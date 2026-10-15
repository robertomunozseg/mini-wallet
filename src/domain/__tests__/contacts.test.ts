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

const names = (list: readonly Contact[]): string[] => {
  return list.map((contact) => contact.name);
};
describe("filterContacts", () => {
  it("returns every contact for an empty or blank query", () => {
    expect(filterContacts(contacts, "")).toEqual(contacts);
    expect(filterContacts(contacts, "   ")).toEqual(contacts);
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
});

describe("groupContacts", () => {
  it("splits a sorted list in favorites and the rest, keeping the order", () => {
    const { favorites, others } = groupContacts(sortContacts(contacts));
    expect(names(favorites)).toEqual(["Ana García", "Luis Hernández", "María López"]);
    expect(names(others)).toEqual(["Beto Díaz", "Carlos Ruiz"]);
  });
});
