import { describe, expect, it } from "vitest";

describe("test setup", () => {
  it("runs vitest with jest-dom matchers available", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    expect(element).toBeInTheDocument();
  });
});
