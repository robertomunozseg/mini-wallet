"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import type { ApiError } from "@/domain/errors";
import type { Movement } from "@/domain/types";
import { MovementItem } from "./MovementItem";

type VirtualMovementListProps = {
  movements: Movement[];
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreError: ApiError | null;
  loadMore: () => void;
};

// Height of the scroll area. The virtualizer also needs it before the browser has measured
// anything (server render, tests), so the first rows are already in the HTML.
const VIEWPORT_HEIGHT = 480;
// Rough height of one row; the real one is measured once the row is on screen.
const ROW_HEIGHT_ESTIMATE = 73;
// Rows rendered above and below the visible ones, so fast scrolling does not show blanks.
const OVERSCAN = 5;

function estimateRowHeight(): number {
  return ROW_HEIGHT_ESTIMATE;
}

// Only the rows near the viewport are in the DOM, however many movements are loaded: scrolling
// a list of thousands costs the same as a list of ten. Scrolling to the end loads the next page.
export function VirtualMovementList({
  movements,
  hasMore,
  isLoadingMore,
  loadMoreError,
  loadMore,
}: VirtualMovementListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // One extra row at the end while more pages exist: it shows "Loading more" and its arrival
  // in the rendered window is the signal to request the next page.
  const rowCount = hasMore ? movements.length + 1 : movements.length;

  const getScrollElement = useCallback(() => scrollRef.current, []);
  // Stable keys keep the measured heights attached to the right movement when rows are added.
  const getItemKey = useCallback((index: number) => movements[index]?.id ?? "loader", [movements]);

  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer is used the documented way; its functions are not passed to memoized children
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement,
    estimateSize: estimateRowHeight,
    overscan: OVERSCAN,
    getItemKey,
    initialRect: { width: 0, height: VIEWPORT_HEIGHT },
  });

  const virtualRows = virtualizer.getVirtualItems();
  const lastRenderedIndex = virtualRows.at(-1)?.index;

  useEffect(() => {
    if (lastRenderedIndex === undefined) return;
    const reachedEnd = lastRenderedIndex >= movements.length - 1;
    // No automatic retry after an error: it would loop while the server keeps failing.
    if (reachedEnd && hasMore && !isLoadingMore && !loadMoreError) loadMore();
  }, [lastRenderedIndex, movements.length, hasMore, isLoadingMore, loadMoreError, loadMore]);

  return (
    // A scroll area must be reachable with the keyboard, hence tabIndex.
    <div
      ref={scrollRef}
      role="region"
      aria-label="Movements"
      tabIndex={0}
      className="max-h-[480px] overflow-auto focus-visible:outline-2 focus-visible:outline-blue-600"
    >
      <ul className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {virtualRows.map((row) => {
          const movement = movements[row.index];
          if (movement) {
            return (
              <MovementItem
                key={movement.id}
                movement={movement}
                offsetTop={row.start}
                index={row.index}
                setSize={hasMore ? -1 : movements.length}
                measureRef={virtualizer.measureElement}
              />
            );
          }
          return (
            <li
              key="loader"
              ref={virtualizer.measureElement}
              data-index={row.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${row.start}px)`,
              }}
              className="flex items-center justify-center gap-3 py-4 text-sm text-zinc-600"
            >
              {loadMoreError ? (
                <>
                  <span role="alert" className="text-red-700">
                    {loadMoreError.message}
                  </span>
                  <Button variant="secondary" onClick={loadMore}>
                    Try again
                  </Button>
                </>
              ) : (
                <span role="status">Loading more…</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
