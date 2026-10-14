import { describe, expect, it } from "vitest";
import { parseListScenario } from "../api";

describe("parseListScenario", () => {
  it.each(["empty", "error", "large", " empty ", " large"])("accepts %j", (value) => {
    expect(parseListScenario(value)).toBe(value.trim());
  });

  it.each(["", "success", "EMPTY", "timeout", "empty,error"])("rejects %j", (value) => {
    expect(parseListScenario(value)).toBeNull();
  });

  it("returns null when there is no value", () => {
    expect(parseListScenario(null)).toBeNull();
    expect(parseListScenario(undefined)).toBeNull();
  });
});
