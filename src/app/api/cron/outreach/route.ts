import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getHqEmail } from "@/lib/hq/session";
import { runOutreach } from "@/lib/outreach/run";
import { sendDigest } from "@/lib/outreach/digest";
import { getBusinessDate } from "@/lib/utils/businessDate";

/**
 * The outreach bot's one entry point. Vercel's scheduler calls it every
 * morning (see `vercel.json`); a signed-in HQ session can call it by hand on
 * a day the schedule was missed.
 *
 * It is safe to call twice. `runOutreach` counts what today's account already
 * sent before it spends any of the cap, and every step it moves is a
 * conditional update on the step the lead was read at.
 */

/** Vercel sets `Authorization: Bearer $CRON_SECRET` on a scheduled call. */
async function allowed(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && request.headers.get("authorization") === `Bearer ${secret}`) return true;
  return Boolean(await getHqEmail());
}

export async function GET(request: Request) {
  if (!(await allowed(request))) return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  await connectToDatabase();
  const summary = await runOutreach();
  const date = getBusinessDate();
  const digested = await sendDigest(summary, date);

  return NextResponse.json({ date, digested, ...summary });
}

/** Vercel cron uses GET; POST is here so HQ's "Run now" button can use it too. */
export const POST = GET;
