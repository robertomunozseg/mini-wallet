import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { asCents } from "@/domain/money";
import { renderWithStore } from "@/test-utils/render-with-store";
import { setAmount, setRecipient } from "@/store/slices/transferSlice";
import { makeStore } from "@/store/store";
import { AmountStep } from "../components/AmountStep";

const balanceCents = asCents(100_000); // $1,000.00

function field() {
  return screen.getByLabelText("Amount (MXN)");
}

async function typeAmount(value: string) {
  await userEvent.type(field(), value);
  await userEvent.tab(); // blur
}

describe("AmountStep", () => {
  it("shows the available balance", () => {
    renderWithStore(<AmountStep balanceCents={balanceCents} />);
    expect(screen.getByText("$1,000.00")).toBeInTheDocument();
  });

  it("shows no error before the user interacts", () => {
    renderWithStore(<AmountStep balanceCents={balanceCents} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(field()).not.toHaveAttribute("aria-invalid");
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

    it("turns blue with a valid amount", async () => {
      renderWithStore(<AmountStep balanceCents={balanceCents} />);
      await userEvent.type(field(), "50");

      expect(next()).not.toHaveAttribute("aria-disabled");
      expect(next()).toHaveClass("bg-blue-600");
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

    it("rejects 0.00", async () => {
      renderWithStore(<AmountStep balanceCents={balanceCents} />);
      await typeAmount("0.00");
      expect(screen.getByRole("alert")).toHaveTextContent("The amount must be greater than zero.");
    });

    it.each(["-5", "abc", "1.999", "1,25"])("treats %j as not a valid amount", async (value) => {
      renderWithStore(<AmountStep balanceCents={balanceCents} />);
      await typeAmount(value);
      expect(screen.getByRole("alert")).toHaveTextContent("Enter an amount.");
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

    it("clears the error once the amount becomes valid", async () => {
      renderWithStore(<AmountStep balanceCents={balanceCents} />);
      await typeAmount("5000");
      expect(screen.getByRole("alert")).toBeInTheDocument();

      await userEvent.clear(field());
      await userEvent.type(field(), "50");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("does not report the recipient rule in this step", async () => {
      renderWithStore(<AmountStep balanceCents={balanceCents} />);
      await typeAmount("10");
      expect(screen.queryByText("Choose a recipient.")).not.toBeInTheDocument();
    });
  });

  describe("store", () => {
    it("keeps the parsed amount in the store while typing", async () => {
      const { store } = renderWithStore(<AmountStep balanceCents={balanceCents} />);
      await userEvent.type(field(), "12.5");
      expect(store.getState().transfer.amountCents).toBe(1250);
    });

    it("stores null when the text is not a valid amount", async () => {
      const { store } = renderWithStore(<AmountStep balanceCents={balanceCents} />);
      await userEvent.type(field(), "abc");
      expect(store.getState().transfer.amountCents).toBeNull();
    });

    it("refills the field from the store (coming back to the step)", () => {
      const store = makeStore();
      store.dispatch(setAmount(asCents(125_050)));
      renderWithStore(<AmountStep balanceCents={asCents(10_000_000)} />, store);
      expect(field()).toHaveValue("1250.50");
    });
  });

  describe("Continue", () => {
    it("goes to the recipient step with a valid amount", async () => {
      const { store } = renderWithStore(<AmountStep balanceCents={balanceCents} />);
      await userEvent.type(field(), "100");
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(store.getState().transfer.step).toBe("recipient");
      expect(store.getState().transfer.amountCents).toBe(10_000);
    });

    it("also works with the Enter key", async () => {
      const { store } = renderWithStore(<AmountStep balanceCents={balanceCents} />);
      await userEvent.type(field(), "100{Enter}");
      expect(store.getState().transfer.step).toBe("recipient");
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

    it("does not need a recipient to continue", async () => {
      const store = makeStore();
      store.dispatch(setRecipient(""));
      renderWithStore(<AmountStep balanceCents={balanceCents} />, store);
      await userEvent.type(field(), "10");
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      expect(store.getState().transfer.step).toBe("recipient");
    });
  });
});
