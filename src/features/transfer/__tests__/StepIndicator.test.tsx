import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StepIndicator } from "../components/StepIndicator";

const steps = ["Amount", "Recipient", "Summary"] as const;

describe("StepIndicator", () => {
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
});
