import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { asCents } from "@/domain/money";
import { BalanceCard } from "../components/BalanceCard";

describe("BalanceCard", () => {
  it("shows the user name", () => {
    render(<BalanceCard name="Demo User" balanceCents={asCents(1_250_000)} />);
    expect(screen.getByText("Welcome back, Demo User")).toBeInTheDocument();
  });

  it("formats the balance as MXN", () => {
    render(<BalanceCard name="Demo User" balanceCents={asCents(1_250_000)} />);
    expect(screen.getByText("$12,500.00")).toBeInTheDocument();
  });

  it.each([
    [0, "$0.00"],
    [1, "$0.01"],
    [99, "$0.99"],
    [123_456_789, "$1,234,567.89"],
  ])("formats %i cents as %s", (cents, expected) => {
    render(<BalanceCard name="Demo User" balanceCents={asCents(cents)} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("labels the balance with a heading", () => {
    render(<BalanceCard name="Demo User" balanceCents={asCents(1_250_000)} />);
    expect(screen.getByRole("heading", { name: "Available balance" })).toBeInTheDocument();
  });

  it("has a New transfer link to /transfer", () => {
    render(<BalanceCard name="Demo User" balanceCents={asCents(1_250_000)} />);
    expect(screen.getByRole("link", { name: "New transfer" })).toHaveAttribute("href", "/transfer");
  });
});
