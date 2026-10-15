const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MAX_RELATIVE_DAYS = 7;

const relativeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const shortDateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
// Mexico City, like the currency (see formatMoney), so every user sees the same date and time.
const longDateTimeFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});

// "just now", "5 minutes ago", "2 hours ago", "yesterday", "4 days ago".
// After 7 days (or for dates in the future) it shows the date: "Oct 1, 2026".
// `now` is a parameter so the function stays pure and testable.
export const formatRelativeTime = (iso: string, now: Date = new Date()): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const elapsed = now.getTime() - date.getTime();
  if (elapsed < -MINUTE_MS) return shortDateFormat.format(date);
  if (elapsed < MINUTE_MS) return "just now";
  if (elapsed < HOUR_MS) return relativeFormat.format(-Math.floor(elapsed / MINUTE_MS), "minute");
  if (elapsed < DAY_MS) return relativeFormat.format(-Math.floor(elapsed / HOUR_MS), "hour");
  if (elapsed < MAX_RELATIVE_DAYS * DAY_MS) {
    return relativeFormat.format(-Math.floor(elapsed / DAY_MS), "day");
  }
  return shortDateFormat.format(date);
};

// "October 14, 2026 at 12:30 PM". An invalid date gives "—" instead of throwing.
export const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : longDateTimeFormat.format(date);
};
