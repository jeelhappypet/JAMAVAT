import { KEYWORD_PAGES } from "@/lib/site/content";

/**
 * The allowlists for website analytics, kept apart from `lib/site/stats.ts`
 * so HQ's screen can name a button without dragging Mongoose and the
 * database connection into the browser bundle.
 */

/** Every page that counts a view. Language lives in its own field, so `/gu/...` maps to the same path. */
export const TRACKED_PATHS: readonly string[] = ["/", "/pricing", "/terms", ...KEYWORD_PAGES.map((page) => `/${page.slug}`)];

/** Every button worth counting, and the words HQ sees for it. */
export const TRACKED_LABELS: Record<string, string> = {
  demo: "Book a free demo",
  "demo-header": "Demo (header)",
  "see-how": "See how it works",
  whatsapp: "WhatsApp",
  phone: "Phone",
  instagram: "Instagram",
  pricing: "Pricing",
  "staff-login": "Restaurant login",
  "plan-demo": "Demo (from a plan)",
  "inquiry-sent": "Inquiry submitted",
};

/** `/gu/pricing` → `/pricing`; anything not on the list is refused. */
export function normalisePath(path: string): string | null {
  const clean = path.replace(/^\/gu(?=\/|$)/, "") || "/";
  const withoutTrailing = clean.length > 1 ? clean.replace(/\/$/, "") : clean;
  return TRACKED_PATHS.includes(withoutTrailing) ? withoutTrailing : null;
}
