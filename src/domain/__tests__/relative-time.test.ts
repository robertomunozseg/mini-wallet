import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "../relative-time";

const now = new Date("2026-10-14T12:00:00.000Z");

function ago(ms: number): string {
  return new Date(now.getTime() - ms).toISOString();
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it.each([
    [0, "just now"],
    [30 * SECOND, "just now"],
    [59 * SECOND, "just now"],
    [MINUTE, "1 minute ago"],
    [5 * MINUTE, "5 minutes ago"],
    [59 * MINUTE, "59 minutes ago"],
    [HOUR, "1 hour ago"],
    [3 * HOUR, "3 hours ago"],
    [23 * HOUR, "23 hours ago"],
    [DAY, "yesterday"],
    [2 * DAY, "2 days ago"],
    [6 * DAY, "6 days ago"],
  ])("formats %i ms ago as %j", (elapsed, expected) => {
    expect(formatRelativeTime(ago(elapsed), now)).toBe(expected);
  });

  it("shows the date after 7 days", () => {
    expect(formatRelativeTime("2026-10-01T12:00:00.000Z", now)).toBe("Oct 1, 2026");
    expect(formatRelativeTime(ago(7 * DAY), now)).toMatch(/^Oct 7, 2026$/);
  });

  it("tolerates small clock differences into the future", () => {
    expect(formatRelativeTime(new Date(now.getTime() + 30 * SECOND).toISOString(), now)).toBe(
      "just now",
    );
  });

  it("shows the date for clearly future dates", () => {
    expect(formatRelativeTime("2026-10-20T12:00:00.000Z", now)).toBe("Oct 20, 2026");
  });

  it("returns an empty string for an invalid date", () => {
    expect(formatRelativeTime("not-a-date", now)).toBe("");
  });

  it("uses the current time by default", () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe("just now");
  });
});
