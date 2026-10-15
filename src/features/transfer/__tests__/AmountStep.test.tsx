import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { asCents } from "@/domain/money";
import { renderWithStore } from "@/test-utils/render-with-store";
import { AmountStep } from "../components/AmountStep";

const balanceCents = asCents(100_000); // $1,000.00

const field = () => {
  return screen.getByLabelText("Amount (MXN)");
};
const typeAmount = async (value: string) => {
  await userEvent.type(field(), value);
  await userEvent.tab(); // blur
};
describe("AmountStep", () => {
  it("shows the available balance", () => {
    renderWithStore(<AmountStep balanceCents={balanceCents} />);
    expect(screen.getByText("$1,000.00")).toBeInTheDocument();
  });

  describe("Continue button", () => {
    function next() {
      return screen.getByRole("button", { name: "Continue" });
    }

    it("is grey while the amount is empty, zero or above the balance", async () => {
      renderWithStore(<AmountStep balanceCents={balanceCents} />);
      expect(next()).toHaveAttribute("aria-disabled", "true");

      await userEvent.type(field(), "0");
      expect(next()).toHaveAttribute("aria-disabled", "true");

      await userEvent.clear(field());
      await userEvent.type(field(), "1000.01");
      expect(next()).toHaveAttribute("aria-disabled", "true");
    });

    it("still shows the error when it is pressed", async () => {
      renderWithStore(<AmountStep balanceCents={balanceCents} />);
      await userEvent.click(next());

      expect(screen.getByRole("alert")).toHaveTextContent("Enter an amount.");
    });
  });

  describe("rules", () => {
    it("requires an amount", async () => {
      renderWithStore(<AmountStep balanceCents={balanceCents} />);
      await userEvent.click(field());
      await userEvent.tab();

      expect(screen.getByRole("alert")).toHaveTextContent("Enter an amount.");
      expect(field()).toHaveAttribute("aria-invalid", "true");
    });

    it("rejects zero (AMOUNT_NOT_POSITIVE)", async () => {
      renderWithStore(<AmountStep balanceCents={balanceCents} />);
      await typeAmount("0");
      expect(screen.getByRole("alert")).toHaveTextContent("The amount must be greater than zero.");
    });

    it("rejects balance + 1 cent (INSUFFICIENT_BALANCE)", async () => {
      renderWithStore(<AmountStep balanceCents={balanceCents} />);
      await typeAmount("1000.01");
      expect(screen.getByRole("alert")).toHaveTextContent("Insufficient balance.");
    });

    it.each(["1000", "1,000.00", "1000.00", "0.01", "$250.50"])(
      "accepts %j without errors",
      async (value) => {
        renderWithStore(<AmountStep balanceCents={balanceCents} />);
        await typeAmount(value);
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      },
    );
  });

  describe("Continue", () => {
    it("goes to the recipient step with a valid amount", async () => {
      const { store } = renderWithStore(<AmountStep balanceCents={balanceCents} />);
      await userEvent.type(field(), "100");
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(store.getState().transfer.step).toBe("recipient");
      expect(store.getState().transfer.amountCents).toBe(10_000);
    });

    it("stays on the step and explains the problem with an empty field", async () => {
      const { store } = renderWithStore(<AmountStep balanceCents={balanceCents} />);
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(store.getState().transfer.step).toBe("amount");
      expect(screen.getByRole("alert")).toHaveTextContent("Enter an amount.");
    });

    it("stays on the step when the amount is above the balance", async () => {
      const { store } = renderWithStore(<AmountStep balanceCents={balanceCents} />);
      await userEvent.type(field(), "2000");
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(store.getState().transfer.step).toBe("amount");
      expect(screen.getByRole("alert")).toHaveTextContent("Insufficient balance.");
    });
  });
});
