import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_OPTIONS,
  STAFF_SESSION_COOKIE,
  createSessionToken,
  readSessionToken,
  shouldRefreshSession,
} from "@/lib/auth/session";
import { appPath, appRelativePath, canAccessPage, homePathFor, slugOfPath } from "@/lib/auth/access";

/** Inside a restaurant's app: open to everyone, staff session or not. */
const PUBLIC_APP_PATHS = ["/login", "/welcome"];

/**
 * Paths that moved under `/r/{slug}` when Jamavat started serving many
 * restaurants. A device that still opens one (an installed app with
 * `start_url: "/"`, a bookmark, a shortcut) is sent to its own restaurant's
 * copy using the slug baked into its session cookie.
 */
const MOVED_PATHS = ["/counter", "/kitchen", "/today", "/menu", "/tables", "/staff", "/reports", "/settings", "/whatsapp", "/new-order", "/login", "/setup"];

/**
 * Optimistic page guard (cookie signature only, no DB). API routes are
 * excluded by the matcher and do their own full check via requireStaff().
 * Jamavat's own pages (the website, `/hq`) and the guest QR pages are open
 * and never touched here.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = readSessionToken(request.cookies.get(STAFF_SESSION_COOKIE)?.value);

  if (!pathname.startsWith("/r/")) {
    // `/` is Jamavat's website for everyone except a staff device: an app
    // installed before per-restaurant links still opens it, and restaurant
    // staff must never land on the sales page.
    const moved = pathname === "/" || MOVED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
    if (moved && session) {
      const target = pathname === "/setup" || pathname === "/" ? "/login" : pathname;
      if (session.slug) return NextResponse.redirect(new URL(appPath(session.slug, target) + search, request.url));
      // A cookie from before tenancy doesn't name the restaurant; /go reads it from the database once.
      const go = new URL("/go", request.url);
      if (target !== "/login") go.searchParams.set("next", target + search);
      return NextResponse.redirect(go);
    }
    // Everything else at the root is Jamavat's own site or the guest QR pages.
    return NextResponse.next();
  }

  const slug = slugOfPath(pathname);
  const path = appRelativePath(pathname);
  const isPublic = PUBLIC_APP_PATHS.includes(path);

  if (!session) {
    if (isPublic) return NextResponse.next();
    const loginUrl = new URL(appPath(slug!, "/login"), request.url);
    if (path !== "/") loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // Someone else's restaurant: send them to their own app rather than a login
  // screen they can't use. (A cookie from before tenancy has no slug — the
  // page's own check loads the restaurant and re-issues the cookie.)
  if (session.slug && session.slug !== slug) {
    return NextResponse.redirect(new URL(appPath(session.slug, homePathFor(session.role)), request.url));
  }

  // A signed cookie can still be stale (staff deactivated / PIN reset): the
  // page's DB check then sends it to /api/auth/expire, which deletes it — so
  // this redirect can't loop.
  if (isPublic) {
    return NextResponse.redirect(new URL(appPath(slug!, homePathFor(session.role)), request.url));
  }

  if (!canAccessPage(session.role, path)) {
    return NextResponse.redirect(new URL(appPath(slug!, homePathFor(session.role)), request.url));
  }

  const response = NextResponse.next();
  if (shouldRefreshSession(session)) {
    const { sid, sv, role, rid } = session;
    response.cookies.set(STAFF_SESSION_COOKIE, createSessionToken({ sid, sv, role, rid, slug: slug ?? undefined }), SESSION_COOKIE_OPTIONS);
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|socket\\.io|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
