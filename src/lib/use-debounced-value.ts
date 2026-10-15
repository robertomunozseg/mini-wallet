"use client";

import { useEffect, useState } from "react";

// Gives back `value` only after it stopped changing for `delayMs`. Use it for what triggers
// heavy work (a request), while the input keeps showing what the user types.
export const useDebouncedValue = <T>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    // Each change cancels the previous timer, so only the last value of a burst gets through.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
};
