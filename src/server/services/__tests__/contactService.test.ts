import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../mock-db";
import { create, list as listPage } from "../contactService";
import { debit } from "../accountService";
import { asCents } from "@/domain/money";
import { FAILING_IDENTIFIER, login } from "../authService";
import type { Contact } from "@/domain/types";

beforeEach(() => {
  resetDb();
});

// All the contacts, following the cursors, so the tests do not depend on the page size.
const allContacts = (): Contact[] => {
  const result = listPage({ limit: 50 });
  if (!result.ok) throw new Error("unexpected error");
  return result.value.items;
};
describe("contactService", () => {
  it("lists the seeded contacts, 3 of them favorites", () => {
    const contacts = allContacts();
    expect(contacts).toHaveLength(4);
    expect(contacts.filter((contact) => contact.isFavorite)).toHaveLength(3);
  });

  it("creates a contact", () => {
    const result = create({ name: "Pedro", phoneOrEmail: "5511112222" }, () => "contact-new");
    expect(result).toEqual({
      ok: true,
      value: { id: "contact-new", name: "Pedro", phoneOrEmail: "5511112222", isFavorite: false },
    });
    expect(allContacts()).toHaveLength(5);
  });

  it("rejects a duplicate phone or email, ignoring case", () => {
    const result = create({ name: "Another Ana", phoneOrEmail: "ANA.GARCIA@example.com" });
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(allContacts()).toHaveLength(4);
  });

  it("rejects an invalid payload", () => {
    expect(create({ name: "", phoneOrEmail: "5511112222" }).ok).toBe(false);
    expect(create({ name: "Pedro", phoneOrEmail: "123" }).ok).toBe(false);
    expect(create(null).ok).toBe(false);
  });
});

describe("contactService.list", () => {
  it("returns favorites first, then by name", () => {
    expect(allContacts().map((contact) => contact.name)).toEqual([
      "Ana García",
      "Luis Hernández",
      "María López",
      "Carlos Ruiz",
    ]);
  });

  it("filters by the search text on the server, ignoring accents", () => {
    const result = listPage({ q: "garcia", limit: 20 });
    expect(result.ok && result.value.items.map((contact) => contact.name)).toEqual(["Ana García"]);
  });

  it("limits the page size and gives a cursor for the rest", () => {
    const first = listPage({ limit: 3 });
    expect(first.ok && first.value.items).toHaveLength(3);
    expect(first.ok && first.value.nextCursor).not.toBeNull();

    const second = listPage({
      limit: 3,
      cursor: first.ok ? (first.value.nextCursor ?? undefined) : undefined,
    });
    expect(second.ok && second.value.items.map((contact) => contact.name)).toEqual(["Carlos Ruiz"]);
    expect(second.ok && second.value.nextCursor).toBeNull();
  });

  it("rejects an invalid cursor with VALIDATION_ERROR", () => {
    expect(listPage({ limit: 20, cursor: "garbage" })).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });
});

describe("accountService.debit", () => {
  it("rejects an amount above the balance", () => {
    expect(debit(asCents(1_250_001))).toMatchObject({
      ok: false,
      error: { code: "INSUFFICIENT_FUNDS" },
    });
  });

  it("returns the new balance", () => {
    expect(debit(asCents(250_000))).toEqual({ ok: true, value: 1_000_000 });
  });
});

describe("authService.login", () => {
  it("fails for the simulated failing identifier", () => {
    expect(login(FAILING_IDENTIFIER)).toMatchObject({
      ok: false,
      error: { code: "INVALID_CREDENTIALS" },
    });
  });

  it("signs in the demo user for any other identifier", () => {
    expect(login("5512345678")).toMatchObject({ ok: true, value: { id: "user-demo" } });
  });
});
