import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../mock-db";
import { create, list } from "../contactService";
import { debit } from "../accountService";
import { asCents } from "@/domain/money";
import { FAILING_IDENTIFIER, login } from "../authService";

beforeEach(() => {
  resetDb();
});

describe("contactService", () => {
  it("lists the seeded contacts, 3 of them favorites", () => {
    const contacts = list();
    expect(contacts).toHaveLength(4);
    expect(contacts.filter((contact) => contact.isFavorite)).toHaveLength(3);
  });

  it("creates a contact", () => {
    const result = create({ name: "Pedro", phoneOrEmail: "5511112222" }, () => "contact-new");
    expect(result).toEqual({
      ok: true,
      value: { id: "contact-new", name: "Pedro", phoneOrEmail: "5511112222", isFavorite: false },
    });
    expect(list()).toHaveLength(5);
  });

  it("rejects a duplicate phone or email, ignoring case", () => {
    const result = create({ name: "Another Ana", phoneOrEmail: "ANA.GARCIA@example.com" });
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(list()).toHaveLength(4);
  });

  it("rejects an invalid payload", () => {
    expect(create({ name: "", phoneOrEmail: "5511112222" }).ok).toBe(false);
    expect(create({ name: "Pedro", phoneOrEmail: "123" }).ok).toBe(false);
    expect(create(null).ok).toBe(false);
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
