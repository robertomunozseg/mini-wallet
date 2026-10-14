import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { asCents } from "@/domain/money";
import type { Movement } from "@/domain/types";
import { MovementItem } from "../components/MovementItem";

function movement(overrides: Partial<Movement> = {}): Movement {
  return {
    id: "mov-1",
    type: "incoming",
    amountCents: asCents(350_000),
    counterpartName: "Ana García",
    createdAt: "2026-10-12T12:00:00.000Z",
    status: "completed",
    ...overrides,
  };
}

function renderItem(item: Movement) {
  return render(
    <ul>
      <MovementItem movement={item} />
    </ul>,
  );
}

describe("MovementItem", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-14T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows an incoming movement with a plus sign and green color", () => {
    renderItem(movement());

    const amount = screen.getByText("+$3,500.00");
    expect(amount).toHaveClass("text-green-700");
    expect(screen.getByText("Received from")).toHaveClass("sr-only");
    expect(screen.getByText(/Ana García/)).toBeInTheDocument();
  });

  it("shows an outgoing movement with a minus sign and red color", () => {
    renderItem(movement({ type: "outgoing", amountCents: asCents(120_050) }));

    const amount = screen.getByText("-$1,200.50");
    expect(amount).toHaveClass("text-red-700");
    expect(screen.getByText("Sent to")).toHaveClass("sr-only");
  });

  it("shows the relative date and keeps the ISO date in the time element", () => {
    renderItem(movement());

    const time = screen.getByText("2 days ago");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", "2026-10-12T12:00:00.000Z");
  });

  it("does not show a status label for completed movements", () => {
    renderItem(movement());
    expect(screen.queryByText("Pending")).not.toBeInTheDocument();
    expect(screen.queryByText("Failed")).not.toBeInTheDocument();
  });

  it("shows a Pending label", () => {
    renderItem(movement({ status: "pending" }));
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows a Failed label and does not present the amount as money moved", () => {
    renderItem(movement({ type: "outgoing", status: "failed", amountCents: asCents(60_000) }));

    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("-$600.00")).toHaveClass("line-through");
  });

  it("renders as a list item", () => {
    renderItem(movement());
    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });
});
