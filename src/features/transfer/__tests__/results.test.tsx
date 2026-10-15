import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ApiErrorCode } from "@/domain/errors";
import { asCents } from "@/domain/money";
import type { Receipt } from "@/domain/types";
import { setAmount, startConfirm } from "@/store/slices/transferSlice";
import { makeStore } from "@/store/store";
import { renderWithStore } from "@/test-utils/render-with-store";
import { ConfirmationResult } from "../components/ConfirmationResult";
import { ReceiptView } from "../components/ReceiptView";
import type { ConfirmState } from "../hooks/useConfirmTransfer";

const errorState = (code: ApiErrorCode, message = "Server-side text."): ConfirmState => {
  return { status: "error", error: { code, message } };
};
const setup = (state: ConfirmState) => {
  const onRetry = vi.fn();
  const store = makeStore();
  store.dispatch(setAmount(asCents(5_000)));
  store.dispatch(startConfirm());
  const view = renderWithStore(<ConfirmationResult state={state} onRetry={onRetry} />, store);
  return { onRetry, store, container: view.container };
};
describe("ConfirmationResult", () => {
  it("renders nothing while idle", () => {
    const { container } = setup({ status: "idle" });
    expect(container).toBeEmptyDOMElement();
  });

  describe("processing", () => {
    it("shows the spinner and Processing…", () => {
      setup({ status: "processing", slow: false });
      expect(screen.getByText("Processing…")).toBeVisible();
      expect(screen.queryByText("This is taking longer than usual")).not.toBeInTheDocument();
    });

    it("explains when it takes longer than usual", () => {
      setup({ status: "processing", slow: true });
      expect(screen.getByText("Processing…")).toBeVisible();
      expect(screen.getByText("This is taking longer than usual")).toBeVisible();
    });
  });

  it("success tells the user the receipt is opening", () => {
    setup({ status: "success" });
    expect(screen.getByRole("status")).toHaveTextContent("Transfer completed");
  });

  describe("NETWORK_ERROR", () => {
    it("shows the message and Try again, which retries", async () => {
      const { onRetry } = setup(errorState("NETWORK_ERROR", "We could not reach the server."));

      expect(screen.getByRole("alert")).toHaveTextContent("We could not reach the server.");
      await userEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe("INSUFFICIENT_FUNDS", () => {
    it("shows the error and Change amount, which returns to the amount step", async () => {
      const { store } = setup(errorState("INSUFFICIENT_FUNDS", "Not enough balance."));

      expect(screen.getByRole("alert")).toHaveTextContent("Not enough balance.");
      expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Change amount" }));

      expect(store.getState().transfer.step).toBe("amount");
      expect(store.getState().transfer.idempotencyKey).toBeNull();
    });
  });

  describe("TIMEOUT", () => {
    it("warns that it may have been processed and offers Try again and Back to home", async () => {
      const { onRetry } = setup(errorState("TIMEOUT"));

      expect(screen.getByRole("alert")).toHaveTextContent("It may have been processed");
      expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/home");
      await userEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe("UNKNOWN_ERROR", () => {
    it("shows the generic message and only Back to home", () => {
      setup(errorState("UNKNOWN_ERROR", "Something went wrong. Please try again."));

      expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
      expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/home");
      expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    });
  });
});

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
