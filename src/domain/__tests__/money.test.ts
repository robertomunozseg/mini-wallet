import { describe, expect, it } from "vitest";
import { asCents, centsToInput, formatMoney, fromCents, subtractCents, toCents } from "../money";

describe("toCents", () => {
  it.each([
    ["1250.50", 125050],
    ["1,250.50", 125050],
    ["1,250", 125000],
    ["10", 1000],
    ["0.5", 50],
    ["0.05", 5],
    ["$20", 2000],
    ["  99.99  ", 9999],
    ["0", 0],
    ["0.00", 0],
  ])("parses %j as %i cents", (input, expected) => {
    expect(toCents(input)).toBe(expected);
  });

  it("avoids floating point errors", () => {
    expect(toCents("1.15")).toBe(115);
    expect(toCents("19.99")).toBe(1999);
  });

  it.each([
    "",
    "   ",
    "abc",
    "-5",
    "-0.01",
    "1.999",
    "1.",
    ".5",
    "1,25",
    "1,2500",
    "1.2.3",
    "1e3",
    "12 50",
  ])("returns null for invalid input %j", (input) => {
    expect(toCents(input)).toBeNull();
  });

  it("returns null when the amount is not a safe integer in cents", () => {
    expect(toCents("99999999999999999999")).toBeNull();
  });
});

describe("fromCents", () => {
  it("converts cents to units", () => {
    expect(fromCents(asCents(125050))).toBe(1250.5);
    expect(fromCents(asCents(5))).toBe(0.05);
  });
});

describe("formatMoney", () => {
  it("formats cents as MXN with es-MX", () => {
    expect(formatMoney(asCents(125050))).toBe("$1,250.50");
  });

  it("formats zero", () => {
    expect(formatMoney(asCents(0))).toBe("$0.00");
  });
});

describe("centsToInput", () => {
  it.each([
    [125050, "1250.50"],
    [100, "1.00"],
    [5, "0.05"],
    [0, "0.00"],
    [115, "1.15"],
  ])("converts %i cents to %j", (cents, expected) => {
    expect(centsToInput(asCents(cents))).toBe(expected);
  });

  it("round-trips with toCents", () => {
    for (const cents of [1, 99, 100, 115, 125050, 99_999_999]) {
      expect(toCents(centsToInput(asCents(cents)))).toBe(cents);
    }
  });
});

describe("subtractCents", () => {
  it("subtracts amounts", () => {
    expect(subtractCents(asCents(100_000), asCents(5_000))).toBe(95_000);
  });

  it("allows reaching exactly zero", () => {
    expect(subtractCents(asCents(5_000), asCents(5_000))).toBe(0);
  });
});
