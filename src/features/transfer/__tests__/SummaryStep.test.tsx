import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { asCents } from "@/domain/money";
import { renderWithStore } from "@/test-utils/render-with-store";
import { goToStep, setAmount, setRecipient } from "@/store/slices/transferSlice";
import { makeStore } from "@/store/store";
import { SummaryStep } from "../components/SummaryStep";

const balanceCents = asCents(100_000); // $1,000.00

function storeWith(amountCents: number | null, recipient: string) {
  const store = makeStore();
  store.dispatch(setAmount(amountCents === null ? null : asCents(amountCents)));
  store.dispatch(setRecipient(recipient));
  store.dispatch(goToStep("summary"));
  return store;
}

function confirmButton() {
  return screen.getByRole("button", { name: "Confirm" });
}

describe("SummaryStep", () => {
  describe("with a valid transfer", () => {
    it("shows the amount, the recipient and the balance after the transfer", () => {
      renderWithStore(<SummaryStep balanceCents={balanceCents} />, storeWith(5_000, "Ana García"));

      expect(screen.getByText("$50.00")).toBeInTheDocument();
      expect(screen.getByText("Ana García")).toBeInTheDocument();
      expect(screen.getByText("$950.00")).toBeInTheDocument();
    });

    it("enables Confirm and shows no errors", () => {
      renderWithStore(<SummaryStep balanceCents={balanceCents} />, storeWith(5_000, "Ana García"));

      expect(confirmButton()).toBeEnabled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("allows transferring the whole balance and shows $0.00 left", () => {
      renderWithStore(
        <SummaryStep balanceCents={balanceCents} />,
        storeWith(100_000, "Ana García"),
      );

      expect(confirmButton()).toBeEnabled();
      expect(screen.getByText("$0.00")).toBeInTheDocument();
    });

    it("starts the confirmation with a new idempotency key", async () => {
      const store = storeWith(5_000, "Ana García");
      renderWithStore(<SummaryStep balanceCents={balanceCents} />, store);
      await userEvent.click(confirmButton());

      expect(store.getState().transfer.step).toBe("confirming");
      expect(store.getState().transfer.idempotencyKey).toEqual(expect.any(String));
    });
  });

  describe("with an invalid transfer", () => {
    it("disables Confirm without a recipient (RECIPIENT_REQUIRED)", () => {
      renderWithStore(<SummaryStep balanceCents={balanceCents} />, storeWith(5_000, ""));

      expect(confirmButton()).toBeDisabled();
      expect(screen.getByRole("alert")).toHaveTextContent("Choose a recipient.");
    });

    it("treats a blank recipient as missing", () => {
      renderWithStore(<SummaryStep balanceCents={balanceCents} />, storeWith(5_000, "   "));

      expect(confirmButton()).toBeDisabled();
      expect(screen.getByRole("alert")).toHaveTextContent("Choose a recipient.");
    });

    it("disables Confirm without an amount", () => {
      renderWithStore(<SummaryStep balanceCents={balanceCents} />, storeWith(null, "Ana García"));

      expect(confirmButton()).toBeDisabled();
      expect(screen.getByRole("alert")).toHaveTextContent("Enter an amount.");
    });

    it("disables Confirm with a zero amount", () => {
      renderWithStore(<SummaryStep balanceCents={balanceCents} />, storeWith(0, "Ana García"));

      expect(confirmButton()).toBeDisabled();
      expect(screen.getByRole("alert")).toHaveTextContent("The amount must be greater than zero.");
    });

    it("disables Confirm when the amount is above the balance", () => {
      renderWithStore(
        <SummaryStep balanceCents={balanceCents} />,
        storeWith(100_001, "Ana García"),
      );

      expect(confirmButton()).toBeDisabled();
      expect(screen.getByRole("alert")).toHaveTextContent("Insufficient balance.");
    });

    it("lists every broken rule", () => {
      renderWithStore(<SummaryStep balanceCents={balanceCents} />, storeWith(100_001, ""));

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Insufficient balance.");
      expect(alert).toHaveTextContent("Choose a recipient.");
    });

    it("does not show a balance after the transfer", () => {
      renderWithStore(<SummaryStep balanceCents={balanceCents} />, storeWith(5_000, ""));
      expect(screen.queryByText("$950.00")).not.toBeInTheDocument();
    });

    it("does not start the confirmation when Confirm is disabled", async () => {
      const store = storeWith(5_000, "");
      renderWithStore(<SummaryStep balanceCents={balanceCents} />, store);
      await userEvent.click(confirmButton());

      expect(store.getState().transfer.step).toBe("summary");
      expect(store.getState().transfer.idempotencyKey).toBeNull();
    });
  });
});
