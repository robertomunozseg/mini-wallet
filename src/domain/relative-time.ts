const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MAX_RELATIVE_DAYS = 7;

const relativeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

// "just now", "5 minutes ago", "2 hours ago", "yesterday", "4 days ago".
// After 7 days (or for dates in the future) it shows the date: "Oct 1, 2026".
// `now` is a parameter so the function stays pure and testable.
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const elapsed = now.getTime() - date.getTime();
  if (elapsed < -MINUTE_MS) return dateFormat.format(date);
  if (elapsed < MINUTE_MS) return "just now";
  if (elapsed < HOUR_MS) return relativeFormat.format(-Math.floor(elapsed / MINUTE_MS), "minute");
  if (elapsed < DAY_MS) return relativeFormat.format(-Math.floor(elapsed / HOUR_MS), "hour");
  if (elapsed < MAX_RELATIVE_DAYS * DAY_MS) {
    return relativeFormat.format(-Math.floor(elapsed / DAY_MS), "day");
  }
  return dateFormat.format(date);
}
