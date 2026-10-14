import { describe, expect, it } from "vitest";
import { parseMovementsScenario } from "../api";

describe("parseMovementsScenario", () => {
  it.each(["empty", "error", " empty ", " error"])("accepts %j", (value) => {
    expect(parseMovementsScenario(value)).toBe(value.trim());
  });

  it.each(["", "success", "EMPTY", "timeout", "empty,error"])("rejects %j", (value) => {
    expect(parseMovementsScenario(value)).toBeNull();
  });

  it("returns null when there is no value", () => {
    expect(parseMovementsScenario(null)).toBeNull();
    expect(parseMovementsScenario(undefined)).toBeNull();
  });
});
