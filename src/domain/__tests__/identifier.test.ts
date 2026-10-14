import { describe, expect, it } from "vitest";
import { detectIdentifierType } from "../identifier";

describe("detectIdentifierType", () => {
  it.each(["ana@example.com", "ana@", "@", "  ana@example.com  "])(
    "detects %j as email",
    (value) => {
      expect(detectIdentifierType(value)).toBe("email");
    },
  );

  it.each(["5512345678", "55 1234 5678", "55-1234-5678", "5"])("detects %j as phone", (value) => {
    expect(detectIdentifierType(value)).toBe("phone");
  });

  it.each(["", "   ", "ana", "55ab", "+525512345678"])("detects %j as unknown", (value) => {
    expect(detectIdentifierType(value)).toBe("unknown");
  });
});
