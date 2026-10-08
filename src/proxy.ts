import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_OPTIONS,
  STAFF_SESSION_COOKIE,
  createSessionToken,
  readSessionToken,
  shouldRefreshSession,
} from "@/lib/auth/session";
import { canAccessPage, homePathFor } from "@/lib/auth/access";

const PUBLIC_PATHS = ["/login", "/setup"];
/** Guest QR pages: open to everyone, staff session or not. */
const GUEST_PREFIX = "/t/";
/** Open to everyone, logged in or not (Meta and guests link to the privacy policy). */
const OPEN_PATHS = ["/privacy"];

/**
 * Optimistic page guard (cookie signature only, no DB). API routes are
 * excluded by the matcher and do their own full check via requireStaff().
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith(GUEST_PREFIX) || OPEN_PATHS.includes(pathname)) return NextResponse.next();
  const session = readSessionToken(request.cookies.get(STAFF_SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!session) {
    if (isPublic) return NextResponse.next();
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // A signed cookie can still be stale (staff deactivated / PIN reset): home's
  // DB check then sends it to /api/auth/expire, which deletes it — so this
  // redirect can't loop.
  if (isPublic) {
    return NextResponse.redirect(new URL(homePathFor(session.role), request.url));
  }

  if (!canAccessPage(session.role, pathname)) {
    return NextResponse.redirect(new URL(homePathFor(session.role), request.url));
  }

  const response = NextResponse.next();
  if (shouldRefreshSession(session)) {
    const { sid, sv, role } = session;
    response.cookies.set(STAFF_SESSION_COOKIE, createSessionToken({ sid, sv, role }), SESSION_COOKIE_OPTIONS);
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|socket\\.io|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
