import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { SITE_STAT_KINDS } from "@/types";
import { looksLikeBot, recordSiteStat } from "@/lib/site/stats";

const beaconSchema = z.object({
  path: z.string().max(120),
  lang: z.enum(["en", "gu"]),
  kind: z.enum(SITE_STAT_KINDS),
  label: z.string().max(40).default("page"),
});

/**
 * One view or one button press on Jamavat's own website.
 *
 * Public and unauthenticated, so it is written to be boring to abuse: the
 * only effect is `$inc` on one of a fixed set of counters, the path and
 * label must be on an allowlist (lib/site/stats.ts), and nothing about the
 * caller is stored — no address, no cookie, no visitor id.
 *
 * It always answers 204, whatever happened. The page sends this with
 * `sendBeacon` and never reads the reply, and an endpoint that reported
 * "that label was rejected" would just be telling a script what to send
 * next.
 */
export async function POST(request: NextRequest) {
  const noContent = new NextResponse(null, { status: 204 });
  try {
    if (looksLikeBot(request.headers.get("user-agent"))) return noContent;
    const body = beaconSchema.parse(await request.json());
    await recordSiteStat(body);
  } catch {
    // A counter is not worth a 500 on a page someone is reading.
  }
  return noContent;
}
