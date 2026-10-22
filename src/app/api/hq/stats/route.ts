import { NextResponse } from "next/server";
import { requireHq } from "@/lib/hq/guard";
import { getSiteStats } from "@/lib/site/stats";
import { getTranslator } from "@/lib/i18n/server";
import { respond } from "@/lib/api";

/** How the website did over the last `days` days — HQ's Website tab. */
export async function GET(request: Request) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const asked = Number(new URL(request.url).searchParams.get("days"));
    const days = [7, 30, 90].includes(asked) ? asked : 7;
    return NextResponse.json(await getSiteStats(days));
  });
}
