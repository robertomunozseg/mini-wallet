import { NextResponse, type NextRequest } from "next/server";
import { isValidSessionToken, SESSION_COOKIE } from "@/server/session-token";

// Optimistic check for a better UX (no flash of a protected page). Real authorization still
// happens on the server: route handlers and the (wallet) layout call getSession().
// The token value is checked, not just the cookie presence, so a bad cookie cannot cause a
// redirect loop between /login and /home.
export function proxy(request: NextRequest) {
  const isSignedIn = isValidSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (isLoginPage && isSignedIn) {
    return NextResponse.redirect(new URL("/home", request.url));
  }
  if (!isLoginPage && !isSignedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/home/:path*", "/transfer/:path*"],
};
