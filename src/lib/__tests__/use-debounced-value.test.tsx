import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "../use-debounced-value";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(initial: string, delayMs = 300) {
  return renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
    initialProps: { value: initial, delay: delayMs },
  });
}

describe("useDebouncedValue", () => {
  it("returns the initial value right away", () => {
    const { result } = setup("ana");
    expect(result.current).toBe("ana");
  });

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

  it("never exposes the intermediate values", () => {
    const exposed = new Set<string>();
    const { result, rerender } = setup("");
    exposed.add(result.current);

    for (const typed of ["a", "ab", "abc"]) {
      rerender({ value: typed, delay: 300 });
      exposed.add(result.current);
      act(() => {
        vi.advanceTimersByTime(50);
      });
      exposed.add(result.current);
    }
    act(() => {
      vi.advanceTimersByTime(300);
    });
    exposed.add(result.current);

    expect([...exposed].sort()).toEqual(["", "abc"]);
  });

  it("follows a value that changes again after settling", () => {
    const { result, rerender } = setup("a");
    rerender({ value: "b", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("b");

    rerender({ value: "c", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("c");
  });

  it("goes back to an earlier value if the user undoes the change within the delay", () => {
    const { result, rerender } = setup("a");
    rerender({ value: "b", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: "a", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("a");
  });

  it("uses the new delay when it changes", () => {
    const { result, rerender } = setup("", 1000);
    rerender({ value: "a", delay: 100 });

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("a");
  });

  it("clears its timer when unmounted", () => {
    const { rerender, unmount } = setup("");
    rerender({ value: "a", delay: 300 });
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps a single pending timer however many times the value changes", () => {
    const { rerender } = setup("");
    for (const typed of ["a", "ab", "abc", "abcd"]) rerender({ value: typed, delay: 300 });
    expect(vi.getTimerCount()).toBe(1);
  });

  it("works with other types", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 1 },
    });
    rerender({ value: 2 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(2);
  });
});
