import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Input } from "../Input";

describe("Input", () => {
  it("associates the label with the input", async () => {
    render(<Input label="Amount" />);
    const input = screen.getByLabelText("Amount");
    await userEvent.type(input, "10");
    expect(input).toHaveValue("10");
  });

  it("has no error semantics when there is no error", () => {
    render(<Input label="Amount" />);
    const input = screen.getByLabelText("Amount");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the error as an alert linked to the input", () => {
    render(<Input label="Amount" error="Enter an amount." />);
    const input = screen.getByLabelText("Amount");
    const alert = screen.getByRole("alert");

    expect(alert).toHaveTextContent("Enter an amount.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter an amount.");
  });

  it("gives each input its own id", () => {
    render(
      <>
        <Input label="Amount" />
        <Input label="Recipient" />
      </>,
    );
    expect(screen.getByLabelText("Amount").id).not.toBe(screen.getByLabelText("Recipient").id);
  });
});
