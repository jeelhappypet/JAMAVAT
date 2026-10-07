import type { ReactNode } from "react";
import type { MessageKey } from "@/lib/i18n/messages";

export interface NavItem {
  href: string;
  label: MessageKey;
  /** One-line description on the home cards; items without one are nav-only. */
  description?: MessageKey;
  icon: ReactNode;
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Every staff screen, in nav order. Filter with canAccessPage() for the current role. */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "nav.home",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
      </svg>
    ),
  },
  {
    href: "/new-order",
    label: "nav.newOrder",
    description: "home.newOrder",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    href: "/live-order",
    label: "nav.liveOrders",
    description: "home.liveOrders",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    href: "/kitchen",
    label: "nav.kitchen",
    description: "home.kitchen",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M4 4h16l-1.5 9H5.5L4 4Z" />
        <path d="M8 13v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4" />
      </svg>
    ),
  },
  {
    href: "/menu",
    label: "nav.menu",
    description: "home.menu",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
  {
    href: "/staff",
    label: "nav.staff",
    description: "home.staff",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
      </svg>
    ),
  },
  {
    href: "/developer",
    label: "nav.reports",
    description: "home.reports",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "nav.settings",
    description: "home.settings",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
      </svg>
    ),
  },
];
