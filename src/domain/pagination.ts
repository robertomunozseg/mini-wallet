import { err, ok, type Result } from "./result";

export type Page<T> = { items: T[]; nextCursor: string | null };

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

// The cursor is opaque for the client: the sort key of the last item, as JSON in base64url.
// It goes through UTF-8 bytes because names can have characters outside Latin-1.
export const encodeCursor = (key: unknown): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(key));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

// null when the cursor is not something encodeCursor made for this kind of key.
export const decodeCursor = <K>(
  cursor: string,
  isKey: (value: unknown) => value is K,
): K | null => {
  try {
    const base64 = cursor.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return isKey(value) ? value : null;
  } catch {
    return null;
  }
};

type PaginateOptions<T, K> = {
  limit: number;
  cursor?: string | undefined;
  keyOf: (item: T) => K;
  isKey: (value: unknown) => value is K;
  isAfter: (item: T, key: K) => boolean; // true when the item sorts after the cursor key
};

// "Give me `limit` items after this key", over a list that is already sorted.
// Unlike offset pagination (page 2, page 3), it stays correct when items are added while the
// user scrolls. With a database, the key would be an index and each page one range query.
export const paginate = <T, K>(
  sorted: readonly T[],
  options: PaginateOptions<T, K>,
): Result<Page<T>, "INVALID_CURSOR"> => {
  const { limit, cursor, keyOf, isKey, isAfter } = options;

  let start = 0;
  if (cursor !== undefined) {
    const key = decodeCursor(cursor, isKey);
    if (key === null) return err("INVALID_CURSOR");

    // The items after the cursor are the end of the sorted list: binary search finds where it
    // starts.
    let low = 0;
    let high = sorted.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      const item = sorted[middle];
      if (item !== undefined && isAfter(item, key)) {
        high = middle;
      } else {
        low = middle + 1;
      }
    }
    start = low;
  }

  const items = sorted.slice(start, start + limit);
  const last = items.at(-1);
  const hasMore = last !== undefined && start + limit < sorted.length;
  return ok({ items, nextCursor: hasMore ? encodeCursor(keyOf(last)) : null });
};
