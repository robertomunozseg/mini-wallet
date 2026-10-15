import { describe, expect, it } from "vitest";
import { resolveScenario, SCENARIOS } from "../scenario";

const requestWith = (header?: string): Pick<Request, "headers"> => {
  const headers = new Headers();
  if (header !== undefined) headers.set("x-mock-scenario", header);
  return { headers };
};
describe("resolveScenario", () => {
  it.each(SCENARIOS)("uses the forced scenario %s from the header", (scenario) => {
    // random would give "success"; the header must win.
    expect(resolveScenario(requestWith(scenario), () => 0)).toBe(scenario);
  });

  it("ignores an invalid header and falls back to random", () => {
    expect(resolveScenario(requestWith("nope"), () => 0.65)).toBe("network_error");
    expect(resolveScenario(requestWith(""), () => 0)).toBe("success");
  });

  it.each([
    [0, "success"],
    [0.599, "success"],
    [0.6, "network_error"],
    [0.699, "network_error"],
    [0.7, "insufficient_funds"],
    [0.799, "insufficient_funds"],
    [0.8, "timeout"],
    [0.899, "timeout"],
    [0.9, "unknown_error"],
    [0.999, "unknown_error"],
  ])("maps random value %f to %s", (value, expected) => {
    expect(resolveScenario(requestWith(), () => value)).toBe(expected);
  });
});
