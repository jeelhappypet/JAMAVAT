import type { Lang } from "@/lib/i18n/messages";

/** "7:54 PM" in the viewer's language (Asia/Kolkata). One formatter for every screen. */
export function formatClock(iso: string, lang: Lang): string {
  const text = new Date(iso).toLocaleTimeString(lang === "gu" ? "gu-IN" : "en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
  return text.replace(/\b(am|pm)\b/, (meridiem) => meridiem.toUpperCase());
}
