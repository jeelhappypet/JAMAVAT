import type { MessageKey } from "@/lib/i18n/messages";

export interface NavItem {
  href: string;
  label: MessageKey;
}

/** Admin artboards: underline tabs under the restaurant name. */
export const ADMIN_NAV: NavItem[] = [
  { href: "/today", label: "nav.today" },
  { href: "/menu", label: "nav.menus" },
  { href: "/staff", label: "nav.staffRouting" },
  { href: "/tables", label: "nav.tables" },
  { href: "/reports", label: "nav.reports" },
  { href: "/settings", label: "nav.settings" },
];

/** Counter artboard: pill tabs in a single-row header. */
export const COUNTER_NAV: NavItem[] = [
  { href: "/counter", label: "nav.seats" },
  { href: "/counter/orders", label: "nav.orders" },
  { href: "/new-order", label: "nav.newParcel" },
  { href: "/counter/menu", label: "nav.menu" },
];

/** Pages that wear the counter header (everything else in the shell is admin). */
export function isCounterPath(pathname: string): boolean {
  return pathname === "/new-order" || pathname === "/counter" || pathname.startsWith("/counter/");
}

/** Which tab is current: the longest matching href wins (so /counter/orders isn't "Seats"). */
export function activeHref(items: NavItem[], pathname: string): string | undefined {
  return items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}
