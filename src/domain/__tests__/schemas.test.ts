import { describe, expect, it } from "vitest";
import {
  detectIdentifierType,
  loginSchema,
  movementsQuerySchema,
  newContactSchema,
  transferRequestSchema,
} from "../schemas";

describe("loginSchema", () => {
  it.each(["ana@example.com", "5512345678", "  ana@example.com  "])("accepts %j", (identifier) => {
    expect(loginSchema.safeParse({ identifier }).success).toBe(true);
  });

  it("trims the identifier", () => {
    expect(loginSchema.parse({ identifier: " 5512345678 " }).identifier).toBe("5512345678");
  });

  it.each([
    "",
    "   ",
    "ana",
    "ana@",
    "@example.com",
    "ana@example",
    "551234567",
    "55123456789",
    "55-1234-5678",
    "55123 45678",
    "abcdefghij",
  ])("rejects %j", (identifier) => {
    expect(loginSchema.safeParse({ identifier }).success).toBe(false);
  });
});

describe("newContactSchema", () => {
  it("accepts a valid contact and defaults isFavorite to false", () => {
    const result = newContactSchema.parse({ name: "Ana", phoneOrEmail: "5512345678" });
    expect(result).toEqual({ name: "Ana", phoneOrEmail: "5512345678", isFavorite: false });
  });

  it("rejects an empty name", () => {
    const result = newContactSchema.safeParse({ name: "  ", phoneOrEmail: "5512345678" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid phone or email", () => {
    expect(newContactSchema.safeParse({ name: "Ana", phoneOrEmail: "123" }).success).toBe(false);
  });
});

describe("transferRequestSchema", () => {
  it("accepts a valid request and trims the recipient", () => {
    const result = transferRequestSchema.parse({ amountCents: 1500, recipient: " Ana " });
    expect(result).toEqual({ amountCents: 1500, recipient: "Ana" });
  });

  it.each([0, -1, 10.5, Number.NaN])("rejects amountCents %s", (amountCents) => {
    expect(transferRequestSchema.safeParse({ amountCents, recipient: "Ana" }).success).toBe(false);
  });

  it("rejects an empty recipient", () => {
    expect(transferRequestSchema.safeParse({ amountCents: 1500, recipient: "  " }).success).toBe(
      false,
    );
  });
});

describe("movementsQuerySchema", () => {
  it("uses the default page size when limit is missing", () => {
    expect(movementsQuerySchema.parse({})).toEqual({ limit: 20 });
  });

  it.each(["0", "-1", "51", "1.5", "abc", ""])("rejects limit %j", (limit) => {
    expect(movementsQuerySchema.safeParse({ limit }).success).toBe(false);
  });
});

describe("detectIdentifierType", () => {
  it.each(["ana@example.com", "ana@", "@", "  ana@example.com  "])(
    "detects %j as email",
    (value) => {
      expect(detectIdentifierType(value)).toBe("email");
    },
  );
});
