import { describe, expect, it } from "vitest";
import { paginate } from "../pagination";

type Row = { id: string };

const rows = (count: number): Row[] =>
  Array.from({ length: count }, (_, index) => ({ id: `row-${index + 1}` }));

const pageOf = (items: Row[], limit: number, cursor?: string) =>
  paginate(items, { limit, cursor, idOf: (row) => row.id });

const idsOf = (page: ReturnType<typeof pageOf>): string[] =>
  page.ok ? page.value.items.map((row) => row.id) : [];

describe("paginate", () => {
  it("returns the first `limit` items and a cursor when there are more", () => {
    const page = pageOf(rows(5), 2);
    expect(idsOf(page)).toEqual(["row-1", "row-2"]);
    expect(page.ok && page.value.nextCursor).toBe("row-2");
  });

  it("continues right after the cursor", () => {
    expect(idsOf(pageOf(rows(5), 2, "row-2"))).toEqual(["row-3", "row-4"]);
  });

  it("has no cursor on the last page", () => {
    const page = pageOf(rows(5), 2, "row-4");
    expect(idsOf(page)).toEqual(["row-5"]);
    expect(page.ok && page.value.nextCursor).toBeNull();
  });

  it("has no cursor when the last page is exactly full", () => {
    const page = pageOf(rows(4), 2, "row-2");
    expect(idsOf(page)).toEqual(["row-3", "row-4"]);
    expect(page.ok && page.value.nextCursor).toBeNull();
  });

  it("returns everything with no cursor when the list is shorter than the limit", () => {
    const page = pageOf(rows(3), 10);
    expect(idsOf(page)).toEqual(["row-1", "row-2", "row-3"]);
    expect(page.ok && page.value.nextCursor).toBeNull();
  });

  it("returns an empty page for an empty list", () => {
    const page = pageOf([], 5);
    expect(page).toEqual({ ok: true, value: { items: [], nextCursor: null } });
  });

  it("rejects a cursor that is not in the list", () => {
    expect(pageOf(rows(5), 2, "nope")).toEqual({ ok: false, error: "INVALID_CURSOR" });
  });

  it("walks the whole list without repeating or skipping an item", () => {
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = pageOf(rows(103), 10, cursor);
      if (!page.ok) throw new Error("unexpected error");
      seen.push(...page.value.items.map((row) => row.id));
      cursor = page.value.nextCursor ?? undefined;
    } while (cursor !== undefined);

    expect(seen).toEqual(rows(103).map((row) => row.id));
  });

  it("does not repeat an item when new ones are added before the cursor", () => {
    const first = pageOf(rows(6), 3);
    if (!first.ok) throw new Error("unexpected error");

    // Two new items appear at the top while the user is reading page 1.
    const grown = [{ id: "new-1" }, { id: "new-2" }, ...rows(6)];
    const second = pageOf(grown, 3, first.value.nextCursor ?? undefined);

    expect(idsOf(second)).toEqual(["row-4", "row-5", "row-6"]);
  });
});
