import { beforeEach, describe, expect, it } from "vitest";
import { addMovement, resetDb } from "../../mock-db";
import { list } from "../movementService";

beforeEach(() => {
  resetDb();
});

describe("movementService.list", () => {
  it("returns the seeded movements, newest first", () => {
    const result = list({ limit: 20 });
    expect(result.ok && result.value.items).toHaveLength(8);
    expect(result.ok && result.value.nextCursor).toBeNull();
    const dates = result.ok ? result.value.items.map((m) => m.createdAt) : [];
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("pages through the movements", () => {
    const first = list({ limit: 5 });
    expect(first.ok && first.value.items).toHaveLength(5);
    expect(first.ok && first.value.nextCursor).not.toBeNull();

    const second = list({
      limit: 5,
      cursor: first.ok ? (first.value.nextCursor ?? undefined) : undefined,
    });
    expect(second.ok && second.value.items).toHaveLength(3);
    expect(second.ok && second.value.nextCursor).toBeNull();
  });

  it("does not repeat a movement when a newer one is added between pages", () => {
    const first = list({ limit: 5 });
    if (!first.ok) throw new Error("unexpected error");
    const lastOfFirstPage = first.value.items.at(-1);

    // A new movement is now the newest one: with offset pagination the next page would start
    // with the last movement of the first page again.
    const sourceMovement = first.value.items[0];
    if (!sourceMovement) throw new Error("fixture missing");
    addMovement({ ...sourceMovement, id: "mov-new", createdAt: "2099-01-01T00:00:00.000Z" });

    const second = list({ limit: 5, cursor: first.value.nextCursor ?? undefined });

    expect(second.ok && second.value.items.map((m) => m.id)).not.toContain(lastOfFirstPage?.id);
    expect(second.ok && second.value.items).toHaveLength(3);
  });

  it("rejects an invalid cursor with VALIDATION_ERROR", () => {
    expect(list({ limit: 20, cursor: "garbage" })).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  describe("scenarios", () => {
    it("empty returns an empty page", () => {
      expect(list({ limit: 20, scenario: "empty" })).toEqual({
        ok: true,
        value: { items: [], nextCursor: null },
      });
    });

    it("error returns an UNKNOWN_ERROR", () => {
      expect(list({ limit: 20, scenario: "error" })).toMatchObject({
        ok: false,
        error: { code: "UNKNOWN_ERROR" },
      });
    });
  });
});
