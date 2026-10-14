// No imports from next/headers on purpose: the proxy and session.ts both use this file.

export const SESSION_COOKIE = "mw_session";

// Mock: a real app would store a random, per-session token and look it up in a database.
export const MOCK_SESSION_TOKEN = "mock-session-token";

export function isValidSessionToken(value: string | undefined): boolean {
  return value === MOCK_SESSION_TOKEN;
}
