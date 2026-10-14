"use client";

import { useEffect, useState } from "react";

// Returns `value` only after it stopped changing for `delayMs`. Use it for the value that triggers
// expensive work (a request), while the input itself keeps showing what the user types.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    // Every change cancels the previous timer, so only the last value of a burst gets through.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
