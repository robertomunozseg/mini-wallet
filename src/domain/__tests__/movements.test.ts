import { describe, expect, it } from "vitest";
import { asCents } from "../money";
import { sortMovements } from "../movements";
import type { Movement } from "../types";

const movement = (id: string, createdAt: string): Movement => {
  return {
    id,
    type: "outgoing",
    amountCents: asCents(100),
    counterpartName: "Ana",
    createdAt,
    status: "completed",
  };
};
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
