// Mexico City, like the currency (see formatMoney), so every user sees the same date and time.
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});

// "October 14, 2026 at 12:30 PM". An invalid date gives "—" instead of throwing.
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}
