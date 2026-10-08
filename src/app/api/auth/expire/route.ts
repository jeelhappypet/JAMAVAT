import { NextResponse, type NextRequest } from "next/server";
import { STAFF_SESSION_COOKIE } from "@/lib/auth/session";

/**
 * A cookie with a valid signature whose staff is gone, deactivated or had
 * their PIN reset lands here. Clearing it server-side (not from the login
 * page) matters: while it exists the proxy keeps treating the device as
 * logged in, which with zero staff turned into a /login ⇄ /setup ⇄ / loop.
 */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login?expired=1", request.url));
  response.cookies.delete(STAFF_SESSION_COOKIE);
  return response;
}
