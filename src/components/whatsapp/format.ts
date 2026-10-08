import { getBusinessDate } from "@/lib/utils/businessDate";
import { formatClock } from "@/lib/utils/time";
import type { Lang, Translate } from "@/lib/i18n/messages";

const shortDate = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === "gu" ? "gu-IN" : "en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }).format(new Date(iso));

const yesterday = () => getBusinessDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

/** Inbox list time: "7:54 PM" today, "Yesterday", else "8 Oct". */
export function listTime(iso: string | undefined, lang: Lang, t: Translate): string {
  if (!iso) return "";
  const day = getBusinessDate(new Date(iso));
  if (day === getBusinessDate()) return formatClock(iso, lang);
  if (day === yesterday()) return t("wa.yesterday");
  return shortDate(iso, lang);
}

/** Separator between days in a chat: "Today", "Yesterday", "8 Oct". */
export function dayLabel(iso: string, lang: Lang, t: Translate): string {
  const day = getBusinessDate(new Date(iso));
  if (day === getBusinessDate()) return t("wa.today");
  if (day === yesterday()) return t("wa.yesterday");
  return shortDate(iso, lang);
}

export const sameDay = (a: string, b: string) => getBusinessDate(new Date(a)) === getBusinessDate(new Date(b));

export const byTime = (a: { timestamp: string }, b: { timestamp: string }) => a.timestamp.localeCompare(b.timestamp);
