import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "../ErrorState";

describe("ErrorState", () => {
  it("announces the message in an alert", () => {
    render(<ErrorState message="We couldn't load your movements." />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(alert).toHaveTextContent("We couldn't load your movements.");
  });

  it("accepts a custom title", () => {
    render(<ErrorState title="Transfer failed" message="Try later." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Transfer failed");
  });

  it("does not render a retry button without onRetry", () => {
    render(<ErrorState message="Oops" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onRetry when the retry button is clicked", async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Oops" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("accepts a custom retry label", () => {
    render(<ErrorState message="Oops" onRetry={() => {}} retryLabel="Reload" />);
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });
});
