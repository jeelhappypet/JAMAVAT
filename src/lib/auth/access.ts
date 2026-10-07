import type { StaffRole } from "@/types";

// Client-safe: used by the proxy, server pages, API routes and the home screen.

export const ROLES = {
  admin: ["ADMIN"],
  counter: ["ADMIN", "COUNTER"],
  kitchen: ["ADMIN", "KITCHEN"],
  anyStaff: ["ADMIN", "COUNTER", "KITCHEN"],
} as const satisfies Record<string, readonly StaffRole[]>;

/** Pages not listed here (e.g. "/") are open to every logged-in staff member. */
const PAGE_ACCESS: { prefix: string; roles: readonly StaffRole[] }[] = [
  { prefix: "/new-order", roles: ROLES.counter },
  { prefix: "/live-order", roles: ROLES.counter },
  { prefix: "/pending-order", roles: ROLES.kitchen },
  { prefix: "/menu", roles: ROLES.admin },
  { prefix: "/staff", roles: ROLES.admin },
  { prefix: "/developer", roles: ROLES.admin },
  { prefix: "/settings", roles: ROLES.admin },
];

export function canAccessPage(role: StaffRole, pathname: string): boolean {
  const rule = PAGE_ACCESS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  return !rule || rule.roles.includes(role);
}

/** Clears a stale session cookie, then shows the login screen with a "signed out" note. */
export const EXPIRED_SESSION_PATH = "/api/auth/expire";

/** Where a staff member lands after login, or when they open a page they can't use. */
export function homePathFor(role: StaffRole): string {
  return role === "KITCHEN" ? "/pending-order" : "/";
}
