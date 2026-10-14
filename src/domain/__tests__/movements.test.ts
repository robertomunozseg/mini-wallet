import { describe, expect, it } from "vitest";
import { asCents } from "../money";
import { isMovementAfter, isMovementKey, movementKey, sortMovements } from "../movements";
import type { Movement } from "../types";

function movement(id: string, createdAt: string): Movement {
  return {
    id,
    type: "outgoing",
    amountCents: asCents(100),
    counterpartName: "Ana",
    createdAt,
    status: "completed",
  };
}

describe("sortMovements", () => {
  it("sorts newest first", () => {
    const sorted = sortMovements([
      movement("a", "2026-10-01T10:00:00.000Z"),
      movement("b", "2026-10-03T10:00:00.000Z"),
      movement("c", "2026-10-02T10:00:00.000Z"),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks ties by id, descending, so the order is total", () => {
    const sorted = sortMovements([
      movement("a", "2026-10-01T10:00:00.000Z"),
      movement("c", "2026-10-01T10:00:00.000Z"),
      movement("b", "2026-10-01T10:00:00.000Z"),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["c", "b", "a"]);
  });

  it("does not change the original array", () => {
    const original = [
      movement("a", "2026-10-01T10:00:00.000Z"),
      movement("b", "2026-10-02T10:00:00.000Z"),
    ];
    sortMovements(original);
    expect(original.map((item) => item.id)).toEqual(["a", "b"]);
  });
});

describe("isMovementAfter", () => {
  const key = movementKey(movement("m5", "2026-10-05T10:00:00.000Z"));

  it("is true for older movements", () => {
    expect(isMovementAfter(movement("x", "2026-10-04T10:00:00.000Z"), key)).toBe(true);
  });

  it("is false for newer movements", () => {
    expect(isMovementAfter(movement("x", "2026-10-06T10:00:00.000Z"), key)).toBe(false);
  });

  it("is false for the movement of the key itself", () => {
    expect(isMovementAfter(movement("m5", "2026-10-05T10:00:00.000Z"), key)).toBe(false);
  });

  it("uses the id when the date is equal (smaller id comes after)", () => {
    expect(isMovementAfter(movement("m4", "2026-10-05T10:00:00.000Z"), key)).toBe(true);
    expect(isMovementAfter(movement("m6", "2026-10-05T10:00:00.000Z"), key)).toBe(false);
  });
});

describe("isMovementKey", () => {
  it("accepts a key", () => {
    expect(isMovementKey({ createdAt: "2026-10-05T10:00:00.000Z", id: "m5" })).toBe(true);
  });

  it.each([null, undefined, 5, "text", {}, { id: "m5" }, { createdAt: 1, id: "m5" }])(
    "rejects %j",
    (value) => {
      expect(isMovementKey(value)).toBe(false);
    },
  );
});
