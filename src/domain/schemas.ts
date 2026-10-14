import { z } from "zod";
import { asCents } from "./money";

const MX_PHONE_PATTERN = /^\d{10}$/;

const identifierSchema = z
  .string()
  .trim()
  .min(1, "This field is required")
  .refine(
    (value) => z.email().safeParse(value).success || MX_PHONE_PATTERN.test(value),
    "Enter a valid email or a 10-digit phone number",
  );

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

export type LoginInput = z.infer<typeof loginSchema>;
export type NewContactInput = z.infer<typeof newContactSchema>;
export type TransferRequest = z.infer<typeof transferRequestSchema>;
