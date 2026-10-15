import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "../use-debounced-value";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const setup = (initial: string, delayMs = 300) => {
  return renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
    initialProps: { value: initial, delay: delayMs },
  });
};
describe("useDebouncedValue", () => {
  it("does not change before the delay has passed", () => {
    const { result, rerender } = setup("");
    rerender({ value: "a", delay: 300 });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("");
  });

  it("changes once the delay has passed", () => {
    const { result, rerender } = setup("");
    rerender({ value: "a", delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("a");
  });

  it("restarts the timer with every change, so only the last value of a burst gets through", () => {
    const seen: string[] = [];
    const { result, rerender } = setup("");

    for (const typed of ["g", "ga", "gar", "garc", "garci", "garcia"]) {
      rerender({ value: typed, delay: 300 });
      act(() => {
        vi.advanceTimersByTime(100); // typing fast: less than the delay between keys
      });
      seen.push(result.current);
    }
    expect(seen.every((value) => value === "")).toBe(true);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("garcia");
  });
});
