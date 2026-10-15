import { err, ok, type Result } from "./result";

export type Page<T> = { items: T[]; nextCursor: string | null };

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

type PaginateOptions<T> = {
  limit: number;
  cursor?: string | undefined;
  idOf: (item: T) => string;
};

// One page of a list that is already sorted. The cursor is the id of the last item of the
// previous page, and the next page starts right after it.
// Unlike "page 2, page 3", this stays correct when items are added while the user scrolls: the
// last item they saw still has the same items after it. With a database it would be a query
// like "rows after this id", using an index.
export const paginate = <T>(
  sorted: readonly T[],
  { limit, cursor, idOf }: PaginateOptions<T>,
): Result<Page<T>, "INVALID_CURSOR"> => {
  let start = 0;
  if (cursor !== undefined) {
    const lastSeen = sorted.findIndex((item) => idOf(item) === cursor);
    if (lastSeen === -1) return err("INVALID_CURSOR");
    start = lastSeen + 1;
  }

  const items = sorted.slice(start, start + limit);
  const last = items.at(-1);
  const hasMore = last !== undefined && start + limit < sorted.length;
  return ok({ items, nextCursor: hasMore ? idOf(last) : null });
};
