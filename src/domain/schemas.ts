import { z } from "zod";
import { asCents } from "./money";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./pagination";

const MX_PHONE_PATTERN = /^\d{10}$/;

const identifierSchema = z
  .string()
  .trim()
  .min(1, "This field is required")
  .refine(
    (value) => z.email().safeParse(value).success || MX_PHONE_PATTERN.test(value),
    "Enter a valid email or a 10-digit phone number",
  );

export type IdentifierType = "email" | "phone" | "unknown";

// Guesses what the user is typing so the UI can adapt (e.g. the keyboard). It does not validate:
// validation is done by loginSchema.
export const detectIdentifierType = (value: string): IdentifierType => {
  const text = value.trim();
  if (text.includes("@")) return "email";
  if (/^[\d\s-]+$/.test(text)) return "phone";
  return "unknown";
};

export const loginSchema = z.object({
  identifier: identifierSchema,
});

export const newContactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Name is too long"),
  phoneOrEmail: identifierSchema,
  isFavorite: z.boolean().default(false),
});

// Shape check only. Business rules (balance, etc.) live in validateTransfer.
export const transferRequestSchema = z.object({
  amountCents: z
    .number()
    .int("Amount must be in whole cents")
    .positive("Amount must be positive")
    .transform(asCents),
  recipient: z.string().trim().min(1, "Recipient is required"),
});

// Query string of the list endpoints. Everything arrives as text, so numbers are coerced.
const limitSchema = z.coerce
  .number()
  .int("limit must be a whole number")
  .min(1, "limit must be at least 1")
  .max(MAX_PAGE_SIZE, `limit must be at most ${MAX_PAGE_SIZE}`)
  .default(DEFAULT_PAGE_SIZE);

const cursorSchema = z.string().max(300, "cursor is too long").optional();

export const contactsQuerySchema = z.object({
  q: z.string().trim().max(50, "q is too long").optional(),
  limit: limitSchema,
  cursor: cursorSchema,
});

export const movementsQuerySchema = z.object({
  limit: limitSchema,
  cursor: cursorSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type NewContactInput = z.infer<typeof newContactSchema>;
export type TransferRequest = z.infer<typeof transferRequestSchema>;
