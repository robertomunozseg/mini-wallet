// Kept apart from session.ts on purpose: the proxy needs these and cannot import next/headers.

export const SESSION_COOKIE = "mw_session";

// Mock: a real app would use a random token per session and look it up in a database.
export const MOCK_SESSION_TOKEN = "mock-session-token";

export const isValidSessionToken = (value: string | undefined): boolean =>
  value === MOCK_SESSION_TOKEN;
