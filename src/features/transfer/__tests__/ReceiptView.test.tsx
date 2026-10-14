import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { asCents } from "@/domain/money";
import type { Receipt } from "@/domain/types";
import { ReceiptView } from "../components/ReceiptView";

const receipt: Receipt = {
  transaction: {
    id: "3f2b6c1e-0000-4000-8000-000000000001",
    amountCents: asCents(50_000),
    recipient: "Ana García",
    createdAt: "2026-10-14T18:30:00.000Z",
    status: "completed",
  },
  newBalanceCents: asCents(1_200_000),
};

describe("ReceiptView", () => {
  it("shows the reference, date, amount, recipient and new balance", () => {
    render(<ReceiptView receipt={receipt} />);

    expect(screen.getByText("3f2b6c1e-0000-4000-8000-000000000001")).toBeVisible();
    expect(screen.getByText(/October 14, 2026/)).toBeVisible();
    expect(screen.getByText("$500.00")).toBeVisible();
    expect(screen.getByText("Ana García")).toBeVisible();
    expect(screen.getByText("$12,000.00")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Transfer completed");
  });

  it("links back to the home and to a new transfer", () => {
    render(<ReceiptView receipt={receipt} />);

    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/home");
    expect(screen.getByRole("link", { name: "New transfer" })).toHaveAttribute("href", "/transfer");
  });
});
