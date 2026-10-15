import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { asCents } from "@/domain/money";
import type { Movement } from "@/domain/types";
import { MovementItem } from "../components/MovementItem";

// The component calls formatRelativeTime every time it renders, so counting its calls counts
// renders: a skipped render (memo) makes no call.
const formatCalls = vi.hoisted(() => vi.fn());
vi.mock("@/domain/dates", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/domain/dates")>();
  return {
    ...actual,
    formatRelativeTime: (...args: Parameters<typeof actual.formatRelativeTime>) => {
      formatCalls();
      return actual.formatRelativeTime(...args);
    },
  };
});

const movement: Movement = {
  id: "mov-1",
  type: "incoming",
  amountCents: asCents(350_000),
  counterpartName: "Payroll",
  createdAt: "2026-10-01T09:00:00.000Z",
  status: "completed",
};

function row(overrides: Partial<React.ComponentProps<typeof MovementItem>> = {}) {
  return (
    <ul>
      <MovementItem movement={movement} offsetTop={0} index={0} setSize={-1} {...overrides} />
    </ul>
  );
}

describe("MovementItem memoization", () => {
  beforeEach(() => {
    formatCalls.mockClear();
  });

  it("renders once", () => {
    render(row());
    expect(formatCalls).toHaveBeenCalledTimes(1);
  });

  it("does not render again when the parent re-renders with the same props", () => {
    const { rerender } = render(row());
    rerender(row());
    rerender(row());
    expect(formatCalls).toHaveBeenCalledTimes(1);
  });

  it("renders again when its movement changes", () => {
    const { rerender } = render(row());
    rerender(row({ movement: { ...movement, status: "failed" } }));
    expect(formatCalls).toHaveBeenCalledTimes(2);
  });

  it("renders again when its position changes", () => {
    const { rerender } = render(row());
    rerender(row({ offsetTop: 73, index: 1 }));
    expect(formatCalls).toHaveBeenCalledTimes(2);
  });

  it("renders again when the total changes (all rows loaded)", () => {
    const { rerender } = render(row());
    rerender(row({ setSize: 50 }));
    expect(formatCalls).toHaveBeenCalledTimes(2);
  });
});
