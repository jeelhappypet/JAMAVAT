import { connectToDatabase } from "@/lib/db/mongodb";
import { SiteStat } from "@/models/SiteStat";
import { TRACKED_LABELS, normalisePath } from "@/lib/site/statLabels";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { shiftDate } from "@/lib/reports";
import type { SiteStatKind, SiteStatsDTO } from "@/types";

/**
 * Counting visits and button presses on Jamavat's own website.
 *
 * The write endpoint is public — anything on the internet can call it — so
 * nothing it is told is stored as given. The path and the label have to be
 * on the lists below or the call is dropped: otherwise one script could fill
 * the collection with a million distinct labels overnight, and the numbers
 * HQ reads would be whatever that script decided.
 */

/**
 * Crawlers, previews and uptime checks outnumber people on a new site, and
 * counting them would make the numbers meaningless. This is the cheap half
 * of bot filtering; the other half is that a bot has to run the page's
 * JavaScript to be counted at all.
 */
const BOT = /bot|crawler|spider|crawling|preview|headless|lighthouse|pingdom|curl|wget|monitor|facebookexternalhit|slurp/i;

export function looksLikeBot(userAgent: string | null): boolean {
  return !userAgent || userAgent.length < 12 || BOT.test(userAgent);
}

/** One counter up by one. Upsert, so two visits in the same second both land. */
export async function recordSiteStat({
  path,
  lang,
  kind,
  label,
}: {
  path: string;
  lang: "en" | "gu";
  kind: SiteStatKind;
  label: string;
}): Promise<boolean> {
  const cleanPath = normalisePath(path);
  if (!cleanPath) return false;
  if (kind === "click" && !(label in TRACKED_LABELS)) return false;

  await connectToDatabase();
  await SiteStat.updateOne(
    { day: getBusinessDate(), path: cleanPath, lang, kind, label: kind === "view" ? "page" : label },
    { $inc: { count: 1 } },
    { upsert: true }
  );
  return true;
}

interface StatRow {
  day: string;
  path: string;
  lang: "en" | "gu";
  kind: SiteStatKind;
  label: string;
  count: number;
}

const sumBy = <K extends string | number>(rows: StatRow[], key: (row: StatRow) => K) => {
  const totals = new Map<K, number>();
  for (const row of rows) totals.set(key(row), (totals.get(key(row)) ?? 0) + row.count);
  return totals;
};

/**
 * The last `days` days, plus the same number of days before them so HQ can
 * see whether the week was better than the one before it.
 */
export async function getSiteStats(days: number): Promise<SiteStatsDTO> {
  const to = getBusinessDate();
  const from = shiftDate(to, -(days - 1));
  const previousFrom = shiftDate(from, -days);

  await connectToDatabase();
  const rows = await SiteStat.find({ day: { $gte: previousFrom, $lte: to } })
    .select({ day: 1, path: 1, lang: 1, kind: 1, label: 1, count: 1, _id: 0 })
    .lean<StatRow[]>();

  const current = rows.filter((row) => row.day >= from);
  const previous = rows.filter((row) => row.day < from);
  const views = current.filter((row) => row.kind === "view");
  const clicks = current.filter((row) => row.kind === "click");

  const perDay = new Map<string, { views: number; clicks: number }>();
  for (let day = from; day <= to; day = shiftDate(day, 1)) perDay.set(day, { views: 0, clicks: 0 });
  for (const row of current) {
    const entry = perDay.get(row.day);
    if (entry) entry[row.kind === "view" ? "views" : "clicks"] += row.count;
  }

  const total = (list: StatRow[]) => list.reduce((sum, row) => sum + row.count, 0);

  return {
    from,
    to,
    days,
    views: total(views),
    clicks: total(clicks),
    previousViews: total(previous.filter((row) => row.kind === "view")),
    byDay: [...perDay].map(([day, entry]) => ({ day, ...entry })),
    byPage: [...sumBy(views, (row) => row.path)]
      .map(([path, count]) => ({ path, views: count }))
      .sort((a, b) => b.views - a.views),
    byClick: [...sumBy(clicks, (row) => row.label)]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    byLang: (["en", "gu"] as const).map((lang) => ({
      lang,
      views: total(views.filter((row) => row.lang === lang)),
    })),
  };
}
