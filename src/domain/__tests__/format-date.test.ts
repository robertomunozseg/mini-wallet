import { describe, expect, it } from "vitest";
import { formatDateTime } from "../format-date";

describe("formatDateTime", () => {
  it("formats an ISO date in Mexico City time", () => {
    // 18:30 UTC is 12:30 in Mexico City (UTC-6). \s also matches the narrow space newer ICU puts before PM.
    expect(formatDateTime("2026-10-14T18:30:00.000Z")).toMatch(/^October 14, 2026 at 12:30\sPM$/);
  });

  it("uses the Mexico City day, not the UTC day", () => {
    // 03:00 UTC on the 15th is still the 14th, 9:00 PM in Mexico City.
    expect(formatDateTime("2026-10-15T03:00:00.000Z")).toMatch(/^October 14, 2026 at 9:00\sPM$/);
  });

  it("returns a dash for an invalid date instead of throwing", () => {
    expect(formatDateTime("not a date")).toBe("—");
    expect(formatDateTime("")).toBe("—");
  });
});
