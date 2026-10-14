import { cookies } from "next/headers";
import type { User } from "@/domain/types";
import { getUser } from "./mock-db";

export const SESSION_COOKIE = "mw_session";

// Mock: a real app would store a random, per-session token and look it up in a database.
const MOCK_SESSION_TOKEN = "mock-session-token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type Session = { user: User };

export async function createSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, MOCK_SESSION_TOKEN, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  if (cookieStore.get(SESSION_COOKIE)?.value !== MOCK_SESSION_TOKEN) return null;
  return { user: getUser() };
}
