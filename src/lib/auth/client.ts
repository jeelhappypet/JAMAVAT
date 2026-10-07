"use client";

import { EXPIRED_SESSION_PATH } from "@/lib/auth/access";

/**
 * A 401 from any API means this device's session is no longer valid (staff
 * deactivated, PIN reset by the admin, logged out everywhere). Clear the
 * stale cookie and show the login screen. Returns true if it did.
 */
export function redirectToLoginIfUnauthorized(res: Response): boolean {
  if (res.status !== 401) return false;
  // Full reload on purpose: called from hooks/handlers outside React's router, and it must
  // tear down every socket and poller still running for the dead session.
  window.location.assign(EXPIRED_SESSION_PATH);
  return true;
}
