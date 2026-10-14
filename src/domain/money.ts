import type { Cents } from "./types";

// Plain digits ("1250.50") or thousands separated by commas ("1,250.50"), max 2 decimals.
const AMOUNT_PATTERN = /^(\d+|\d{1,3}(,\d{3})+)(\.\d{1,2})?$/;

export function asCents(value: number): Cents {
  return value as Cents;
}

// Returns null when the text is not a valid non-negative amount. Zero is accepted here;
// "amount must be > 0" is a transfer rule (see validateTransfer).
export function toCents(input: string): Cents | null {
  const text = input.trim().replace(/^\$/, "");
  if (!AMOUNT_PATTERN.test(text)) return null;

  const amount = Number(text.replace(/,/g, ""));
  // Math.round avoids floating point errors such as 1.15 * 100 = 114.99999999999999.
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) ? asCents(cents) : null;
}

export function fromCents(cents: Cents): number {
  return cents / 100;
}

// Plain text for an amount input ("1250.50"), e.g. to refill the field when coming back to a step.
export function centsToInput(cents: Cents): string {
  return fromCents(cents).toFixed(2);
}

export function subtractCents(a: Cents, b: Cents): Cents {
  return asCents(a - b);
}

export function formatMoney(cents: Cents, currency: "MXN" = "MXN"): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(fromCents(cents));
}
