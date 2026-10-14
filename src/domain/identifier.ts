export type IdentifierType = "email" | "phone" | "unknown";

// Guesses what the user is typing so the UI can adapt (e.g. the keyboard). It does not validate:
// validation is done by loginSchema.
export function detectIdentifierType(value: string): IdentifierType {
  const text = value.trim();
  if (text.includes("@")) return "email";
  if (/^[\d\s-]+$/.test(text)) return "phone";
  return "unknown";
}
