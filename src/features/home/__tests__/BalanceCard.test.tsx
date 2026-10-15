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

  it("has a New transfer link to /transfer", () => {
    render(<BalanceCard name="Demo User" balanceCents={asCents(1_250_000)} />);
    expect(screen.getByRole("link", { name: "New transfer" })).toHaveAttribute("href", "/transfer");
  });
});
