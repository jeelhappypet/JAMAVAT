import { cn } from "@/components/ui/cn";
import type { FeatureIcon } from "@/lib/site/content";

/**
 * The line drawings on the feature cards and in the footer. Deliberately one
 * family: 24×24, 1.75 stroke, round caps — eight icons from eight sources is
 * what makes a page look assembled rather than designed.
 *
 * The brand's own cloche is not among them. It is the logo, and a logo that
 * also means "kitchen routing" on one card and "daily report" on another
 * stops meaning Jamavat; it stays in `BrandMark`, once per page.
 */
const PATHS: Record<FeatureIcon | "instagram" | "whatsapp" | "phone" | "mailto", string> = {
  qr: "M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3M8 8h2v2H8zM14 8h2v2h-2zM8 14h2v2H8zM14 14h2v2h-2z",
  route: "M6 4v5a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v5M6 4 4 6.5M6 4l2 2.5M18 20l-2-2.5M18 20l2-2.5",
  bolt: "M13 3 5 13h6l-1 8 8-10h-6l1-8Z",
  verified: "M12 3.5 5 6.2v5c0 4.2 2.9 7.6 7 9.3 4.1-1.7 7-5.1 7-9.3v-5L12 3.5Zm-2.6 8.4 2 2 4-4.2",
  live: "M12 12h.01M8.5 8.5a5 5 0 0 0 0 7M15.5 15.5a5 5 0 0 0 0-7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 18.4a9 9 0 0 0 0-12.8",
  mail: "M4 6.5h16v11H4zM4 7l8 6 8-6",
  report: "M4 20h16M7 16V9M12 16V5M17 16v-5",
  parcel: "M4 8.5 12 4l8 4.5V16L12 20.5 4 16V8.5ZM4 8.5l8 4.5m0 0 8-4.5M12 13v7.5",
  instagram: "M7 3.5h10A3.5 3.5 0 0 1 20.5 7v10a3.5 3.5 0 0 1-3.5 3.5H7A3.5 3.5 0 0 1 3.5 17V7A3.5 3.5 0 0 1 7 3.5ZM12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2ZM17.1 7h.01",
  whatsapp: "M4 20l1.2-4A7.6 7.6 0 1 1 8 18.8L4 20ZM9 9.4c0 3 2.6 5.6 5.6 5.6l.9-1.5-2-.9-.8.8a4.6 4.6 0 0 1-2.1-2.1l.8-.8-.9-2-1.5.9Z",
  phone: "M5 4h3.5l1.5 4-2 1.4a12 12 0 0 0 6.6 6.6L16 14l4 1.5V19a1.5 1.5 0 0 1-1.7 1.5A16.5 16.5 0 0 1 3.5 5.7 1.5 1.5 0 0 1 5 4Z",
  mailto: "M4 6.5h16v11H4zM4 7l8 6 8-6",
};

export function SiteIcon({ name, size = 22, className }: { name: keyof typeof PATHS; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** The feature card's icon in its brand tile. `site-tile` is what tilts it when the card is hovered. */
export function FeatureIconTile({ name, className }: { name: FeatureIcon; className?: string }) {
  return (
    <span className={cn("site-tile flex h-11 w-11 items-center justify-center rounded-[13px] bg-brand-light text-brand-dark", className)}>
      <SiteIcon name={name} size={21} />
    </span>
  );
}

/** The arrow on a call to action. `site-arrow` slides it when the button is hovered. */
export function Arrow({ size = 17 }: { size?: number }) {
  return (
    <svg className="site-arrow" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h13M12 6l6 6-6 6" />
    </svg>
  );
}

/** The green tick in front of a short fact. */
export function Tick({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0 text-success", className)}
      aria-hidden
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
