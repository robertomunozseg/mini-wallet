import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "../ErrorState";
import { Input } from "../Input";

describe("Input", () => {
  it("associates the label with the input", async () => {
    render(<Input label="Amount" />);
    const input = screen.getByLabelText("Amount");
    await userEvent.type(input, "10");
    expect(input).toHaveValue("10");
  });

  it("shows the error as an alert linked to the input", () => {
    render(<Input label="Amount" error="Enter an amount." />);
    const input = screen.getByLabelText("Amount");
    const alert = screen.getByRole("alert");

    expect(alert).toHaveTextContent("Enter an amount.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter an amount.");
  });
});

describe("ErrorState", () => {
  it("announces the message in an alert", () => {
    render(<ErrorState message="We couldn't load your movements." />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(alert).toHaveTextContent("We couldn't load your movements.");
  });

  it("calls onRetry when the retry button is clicked", async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Oops" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
