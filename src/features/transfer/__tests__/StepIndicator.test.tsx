import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StepIndicator } from "../components/StepIndicator";

const steps = ["Amount", "Recipient", "Summary"] as const;

describe("StepIndicator", () => {
  it("lists every step in order", () => {
    render(<StepIndicator steps={steps} currentIndex={0} />);
    const items = screen.getAllByRole("listitem");

    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Amount");
    expect(items[1]).toHaveTextContent("Recipient");
    expect(items[2]).toHaveTextContent("Summary");
  });

  it.each([0, 1, 2])("marks only step %i as the current one", (index) => {
    render(<StepIndicator steps={steps} currentIndex={index} />);
    const items = screen.getAllByRole("listitem");

    items.forEach((item, position) => {
      if (position === index) {
        expect(item).toHaveAttribute("aria-current", "step");
      } else {
        expect(item).not.toHaveAttribute("aria-current");
      }
    });
  });

  it("announces the position to screen readers", () => {
    render(<StepIndicator steps={steps} currentIndex={1} />);
    expect(screen.getByText(/Step 2 of 3/)).toHaveClass("sr-only");
  });

  it("marks finished steps with a check", () => {
    render(<StepIndicator steps={steps} currentIndex={2} />);
    expect(screen.getAllByText("✓")).toHaveLength(2);
  });

  it("is a labelled navigation landmark", () => {
    render(<StepIndicator steps={steps} currentIndex={0} />);
    expect(screen.getByRole("navigation", { name: "Transfer progress" })).toBeInTheDocument();
  });
});
