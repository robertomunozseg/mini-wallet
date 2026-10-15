import type { Cents } from "./types";

// "1250.50" or "1,250.50": digits, optional thousands commas and up to 2 decimals.
const AMOUNT_PATTERN = /^(\d+|\d{1,3}(,\d{3})+)(\.\d{1,2})?$/;

export const asCents = (value: number): Cents => value as Cents;

// null when the text is not a valid amount. Zero is fine here: "greater than zero" is a
// transfer rule (see validateTransfer).
export const toCents = (input: string): Cents | null => {
  const text = input.trim().replace(/^\$/, "");
  if (!AMOUNT_PATTERN.test(text)) return null;

  const amount = Number(text.replace(/,/g, ""));
  // Math.round: 1.15 * 100 is 114.99999999999999 with floating point.
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) ? asCents(cents) : null;
};

export const fromCents = (cents: Cents): number => cents / 100;

// Text for an amount input ("1250.50"), to refill the field when the user comes back to a step.
export const centsToInput = (cents: Cents): string => fromCents(cents).toFixed(2);

export const subtractCents = (a: Cents, b: Cents): Cents => asCents(a - b);

export const formatMoney = (cents: Cents, currency: "MXN" = "MXN"): string =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(fromCents(cents));
