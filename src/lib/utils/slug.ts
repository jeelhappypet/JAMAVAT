/** Words a restaurant link can't be — they'd read like Jamavat's own pages. */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "demo-login",
  "help",
  "hq",
  "jamavat",
  "login",
  "new",
  "r",
  "setup",
  "support",
  "t",
  "www",
]);

export const SLUG_MAX = 40;

/** "Kiran's Thali House" → "kirans-thali-house". Non-Latin names (ગુજરાતી) give "" — the caller picks a fallback. */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
}

/** 3–40 chars of a–z, 0–9 and single dashes, not starting or ending with a dash, not reserved. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= SLUG_MAX && !RESERVED_SLUGS.has(slug);
}
