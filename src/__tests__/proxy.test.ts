// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "../proxy";
import { MOCK_SESSION_TOKEN, SESSION_COOKIE } from "../server/session-token";

const requestTo = (path: string, cookieValue?: string): NextRequest => {
  const headers = new Headers();
  if (cookieValue !== undefined) headers.set("cookie", `${SESSION_COOKIE}=${cookieValue}`);
  return new NextRequest(`http://localhost:3000${path}`, { headers });
};
const expectRedirect = (response: Response, location: string) => {
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(`http://localhost:3000${location}`);
};
describe("proxy", () => {
  it.each(["/home", "/transfer/new", "/transfer/amount/confirm"])(
    "redirects %s to /login without a cookie",
    (path) => {
      expectRedirect(proxy(requestTo(path)), "/login");
    },
  );

  it("redirects to /login when the cookie has an invalid token", () => {
    expectRedirect(proxy(requestTo("/home", "tampered")), "/login");
    expectRedirect(proxy(requestTo("/home", "")), "/login");
  });

  it("redirects a signed-in user from /login to /home", () => {
    expectRedirect(proxy(requestTo("/login", MOCK_SESSION_TOKEN)), "/home");
  });
});
