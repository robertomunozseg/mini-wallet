import { describe, expect, it } from "vitest";
import { asCents } from "../money";
import { validateTransfer } from "../transfer-rules";

const balanceCents = asCents(100_00);

describe("validateTransfer", () => {
  it("accepts a valid transfer and trims the recipient", () => {
    const result = validateTransfer({
      amountCents: asCents(50_00),
      balanceCents,
      recipient: "  Ana  ",
    });
    expect(result).toEqual({ ok: true, value: { amountCents: 50_00, recipient: "Ana" } });
  });

  it("allows an amount equal to the balance", () => {
    const result = validateTransfer({ amountCents: balanceCents, balanceCents, recipient: "Ana" });
    expect(result.ok).toBe(true);
  });

  it("rejects balance + 1 cent", () => {
    const result = validateTransfer({
      amountCents: asCents(100_01),
      balanceCents,
      recipient: "Ana",
    });
    expect(result).toEqual({ ok: false, error: ["INSUFFICIENT_BALANCE"] });
  });

  it("allows 1 cent", () => {
    const result = validateTransfer({ amountCents: asCents(1), balanceCents, recipient: "Ana" });
    expect(result.ok).toBe(true);
  });

  it("rejects zero", () => {
    const result = validateTransfer({ amountCents: asCents(0), balanceCents, recipient: "Ana" });
    expect(result).toEqual({ ok: false, error: ["AMOUNT_NOT_POSITIVE"] });
  });

  it("rejects negative amounts", () => {
    const result = validateTransfer({ amountCents: asCents(-500), balanceCents, recipient: "Ana" });
    expect(result).toEqual({ ok: false, error: ["AMOUNT_NOT_POSITIVE"] });
  });

  it("requires an amount when it could not be parsed", () => {
    const result = validateTransfer({ amountCents: null, balanceCents, recipient: "Ana" });
    expect(result).toEqual({ ok: false, error: ["AMOUNT_REQUIRED"] });
  });

  it.each(["", "   "])("requires a recipient (%j)", (recipient) => {
    const result = validateTransfer({ amountCents: asCents(10_00), balanceCents, recipient });
    expect(result).toEqual({ ok: false, error: ["RECIPIENT_REQUIRED"] });
  });

  it("returns all errors, not just the first one", () => {
    const tooMuch = validateTransfer({ amountCents: asCents(999_99), balanceCents, recipient: "" });
    expect(tooMuch).toEqual({ ok: false, error: ["INSUFFICIENT_BALANCE", "RECIPIENT_REQUIRED"] });

    const nothing = validateTransfer({ amountCents: null, balanceCents, recipient: " " });
    expect(nothing).toEqual({ ok: false, error: ["AMOUNT_REQUIRED", "RECIPIENT_REQUIRED"] });
  });

  it("rejects any positive amount when the balance is zero", () => {
    const result = validateTransfer({
      amountCents: asCents(1),
      balanceCents: asCents(0),
      recipient: "Ana",
    });
    expect(result).toEqual({ ok: false, error: ["INSUFFICIENT_BALANCE"] });
  });
});
