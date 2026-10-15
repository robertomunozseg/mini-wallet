import { cookies } from "next/headers";
import type { User } from "@/domain/types";
import { getUser } from "./mock-db";
import { isValidSessionToken, MOCK_SESSION_TOKEN, SESSION_COOKIE } from "./session-token";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type Session = { user: User };

export const createSession = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, MOCK_SESSION_TOKEN, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
};

export const clearSession = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
};

export const getSession = async (): Promise<Session | null> => {
  const cookieStore = await cookies();
  if (!isValidSessionToken(cookieStore.get(SESSION_COOKIE)?.value)) return null;
  return { user: getUser() };
};
