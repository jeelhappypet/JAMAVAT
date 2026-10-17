import { NextResponse, type NextRequest } from "next/server";
import { STAFF_SESSION_COOKIE, readSessionToken } from "@/lib/auth/session";
import { appPath } from "@/lib/auth/access";

/**
 * A cookie with a valid signature whose staff is gone, deactivated or had
 * their PIN reset lands here. Clearing it server-side (not from the login
 * page) matters: while it exists the proxy keeps treating the device as
 * logged in, which with zero staff turned into a /login ⇄ /setup ⇄ / loop.
 *
 * The cookie still names the restaurant, so the device goes back to its own
 * login screen rather than Jamavat's website.
 */
export function GET(request: NextRequest) {
  const session = readSessionToken(request.cookies.get(STAFF_SESSION_COOKIE)?.value);
  const login = session?.slug ? `${appPath(session.slug, "/login")}?expired=1` : "/";
  const response = NextResponse.redirect(new URL(login, request.url));
  response.cookies.delete(STAFF_SESSION_COOKIE);
  return response;
}
