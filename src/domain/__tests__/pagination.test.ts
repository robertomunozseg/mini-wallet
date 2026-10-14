import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor, paginate } from "../pagination";

type Row = { id: number };

const isRowKey = (value: unknown): value is Row =>
  typeof value === "object" && value !== null && "id" in value && typeof value.id === "number";

function rows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({ id: index + 1 }));
}

function pageOf(items: Row[], limit: number, cursor?: string) {
  return paginate(items, {
    limit,
    cursor,
    keyOf: (row) => row,
    isKey: isRowKey,
    isAfter: (row, key) => row.id > key.id,
  });
}

function ids(page: ReturnType<typeof pageOf>): number[] {
  return page.ok ? page.value.items.map((row) => row.id) : [];
}

describe("cursors", () => {
  it("round-trips a key", () => {
    const key = { id: 42 };
    expect(decodeCursor(encodeCursor(key), isRowKey)).toEqual(key);
  });

  it("round-trips characters outside Latin-1", () => {
    const isNameKey = (value: unknown): value is { name: string } =>
      typeof value === "object" &&
      value !== null &&
      "name" in value &&
      typeof value.name === "string";
    for (const name of ["José Ñandú", "Łukasz", "日本語", "😀 Ana"]) {
      expect(decodeCursor(encodeCursor({ name }), isNameKey)).toEqual({ name });
    }
  });

  it("is url safe (no +, / or =)", () => {
    for (let id = 0; id < 500; id += 1) {
      expect(encodeCursor({ id, text: "??>>~~" })).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it.each(["", "not a cursor", "%%%", "e30", "bnVsbA", "W10"])(
    "rejects the invalid cursor %j",
    (cursor) => {
      expect(decodeCursor(cursor, isRowKey)).toBeNull();
    },
  );

  it("rejects a valid cursor that is not the expected kind of key", () => {
    expect(decodeCursor(encodeCursor({ other: true }), isRowKey)).toBeNull();
  });
});

describe("paginate", () => {
  it("returns the first page and a cursor when there are more items", () => {
    const page = pageOf(rows(25), 10);
    expect(ids(page)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(page.ok && page.value.nextCursor).not.toBeNull();
  });

  it("returns no cursor on the last page", () => {
    const first = pageOf(rows(25), 10);
    const second = pageOf(
      rows(25),
      10,
      first.ok ? (first.value.nextCursor ?? undefined) : undefined,
    );
    const third = pageOf(
      rows(25),
      10,
      second.ok ? (second.value.nextCursor ?? undefined) : undefined,
    );

    expect(ids(third)).toEqual([21, 22, 23, 24, 25]);
    expect(third.ok && third.value.nextCursor).toBeNull();
  });

  it("walks the whole list without repeating or skipping any item", () => {
    const all = rows(1_003);
    const seen: number[] = [];
    let cursor: string | undefined;
    let pages = 0;

    do {
      const page = pageOf(all, 50, cursor);
      expect(page.ok).toBe(true);
      if (!page.ok) return;
      seen.push(...page.value.items.map((row) => row.id));
      cursor = page.value.nextCursor ?? undefined;
      pages += 1;
    } while (cursor !== undefined);

    expect(seen).toEqual(all.map((row) => row.id));
    expect(pages).toBe(21);
  });

  it.each([1, 7, 10, 25])("works with a page size of %i", (limit) => {
    const all = rows(25);
    const seen: number[] = [];
    let cursor: string | undefined;
    do {
      const page = pageOf(all, limit, cursor);
      if (!page.ok) throw new Error("unexpected invalid cursor");
      seen.push(...page.value.items.map((row) => row.id));
      cursor = page.value.nextCursor ?? undefined;
    } while (cursor !== undefined);
    expect(seen).toHaveLength(25);
  });

  it("has no cursor when the list is exactly one page", () => {
    const page = pageOf(rows(10), 10);
    expect(ids(page)).toHaveLength(10);
    expect(page.ok && page.value.nextCursor).toBeNull();
  });

  it("handles an empty list", () => {
    const page = pageOf([], 10);
    expect(page).toEqual({ ok: true, value: { items: [], nextCursor: null } });
  });

  it("returns an empty page for a cursor past the end", () => {
    const page = pageOf(rows(5), 10, encodeCursor({ id: 999 }));
    expect(page).toEqual({ ok: true, value: { items: [], nextCursor: null } });
  });

  it("returns an error for an invalid cursor", () => {
    expect(pageOf(rows(5), 10, "garbage")).toEqual({ ok: false, error: "INVALID_CURSOR" });
  });

  it("keeps the pages stable when an item is added at the start while paging (keyset)", () => {
    const original = rows(30);
    const first = pageOf(original, 10);
    if (!first.ok) throw new Error("unexpected invalid cursor");

    // A new item sorts before everything else (id 0). With offset pagination the next page would
    // repeat the last item of the first page; with a cursor it does not.
    const withNewItem = [{ id: 0 }, ...original];
    const second = pageOf(withNewItem, 10, first.value.nextCursor ?? undefined);

    expect(ids(second)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it("does not need to scan the list: the start position is a binary search", () => {
    let comparisons = 0;
    const all = rows(100_000);
    paginate(all, {
      limit: 20,
      cursor: encodeCursor({ id: 77_777 }),
      keyOf: (row) => row,
      isKey: isRowKey,
      isAfter: (row, key) => {
        comparisons += 1;
        return row.id > key.id;
      },
    });
    // log2(100,000) is about 17.
    expect(comparisons).toBeLessThan(25);
  });
});
