import { describe, expect, it } from "vitest";
import { sortContacts } from "@/domain/contacts";
import { sortMovements } from "@/domain/movements";
import {
  LARGE_CONTACTS_COUNT,
  LARGE_MOVEMENTS_COUNT,
  largeContacts,
  largeMovements,
} from "../large-dataset";

describe("largeMovements", () => {
  it("has 10,000 movements", () => {
    expect(largeMovements()).toHaveLength(LARGE_MOVEMENTS_COUNT);
    expect(LARGE_MOVEMENTS_COUNT).toBe(10_000);
  });

  it("is built once and reused", () => {
    expect(largeMovements()).toBe(largeMovements());
  });

  it("is already sorted newest first", () => {
    const movements = largeMovements();
    expect(movements).toEqual(sortMovements(movements));
  });

  it("has unique ids", () => {
    expect(new Set(largeMovements().map((movement) => movement.id)).size).toBe(10_000);
  });

  it("is deterministic: the first and last movements never change", () => {
    const movements = largeMovements();
    expect(movements[0]).toMatchObject({
      id: "mov-large-00000",
      createdAt: "2026-10-13T12:00:00.000Z",
      type: "incoming",
      status: "failed",
    });
    expect(movements.at(-1)?.id).toBe("mov-large-09999");
  });

  it("has valid amounts, in cents, and the three statuses", () => {
    const movements = largeMovements();
    expect(movements.every((m) => Number.isInteger(m.amountCents) && m.amountCents >= 100)).toBe(
      true,
    );
    expect(new Set(movements.map((m) => m.status))).toEqual(
      new Set(["completed", "pending", "failed"]),
    );
    expect(new Set(movements.map((m) => m.type))).toEqual(new Set(["incoming", "outgoing"]));
  });
});

describe("largeContacts", () => {
  it("has 5,000 contacts", () => {
    expect(largeContacts()).toHaveLength(LARGE_CONTACTS_COUNT);
    expect(LARGE_CONTACTS_COUNT).toBe(5_000);
  });

  it("is built once and reused", () => {
    expect(largeContacts()).toBe(largeContacts());
  });

  it("is already sorted: favorites first, then by name", () => {
    const contacts = largeContacts();
    expect(contacts).toEqual(sortContacts(contacts));
  });

  it("has unique ids and unique 10-digit phones", () => {
    const contacts = largeContacts();
    expect(new Set(contacts.map((c) => c.id)).size).toBe(5_000);
    expect(new Set(contacts.map((c) => c.phoneOrEmail)).size).toBe(5_000);
    expect(contacts.every((c) => /^\d{10}$/.test(c.phoneOrEmail))).toBe(true);
  });

  it("has some favorites and mostly regular contacts", () => {
    const favorites = largeContacts().filter((contact) => contact.isFavorite).length;
    expect(favorites).toBe(125);
  });
});
