import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireHq } from "@/lib/hq/guard";
import { SponsorLead, type SponsorLeadDocument } from "@/models/SponsorLead";
import { mailerProblem, dailyCap, digestTo } from "@/lib/outreach/mailer";
import { whatsappDailyCap, whatsappProblem } from "@/lib/outreach/whatsapp";
import { istDayStart } from "@/lib/outreach/run";
import { OUTREACH_STEPS } from "@/lib/outreach/sequence";
import { toSponsorLeadDTO } from "@/lib/outreach/dto";
import type { SponsorLeadStatus } from "@/types";

/** The filters HQ's tabs map to. "DUE" is the morning list, like Leads. */
function query(filter: string): Record<string, unknown> {
  if (filter === "DUE") return { status: "ACTIVE", nextActionAt: { $lte: new Date() } };
  if (filter === "ALL") return {};
  return { status: filter };
}

/** The sponsor pipeline, plus whether the bot is actually able to send today. */
export async function GET(request: Request) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;

  await connectToDatabase();
  const filter = new URL(request.url).searchParams.get("status") || "DUE";

  const leads = (await SponsorLead.find(query(filter)).sort({ nextActionAt: 1, updatedAt: -1 }).limit(300).lean()) as unknown as SponsorLeadDocument[];

  const dayStart = istDayStart();
  const [counts, todayRows] = await Promise.all([
    SponsorLead.aggregate<{ _id: SponsorLeadStatus; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    SponsorLead.aggregate<{ _id: { channel: string; failed: boolean }; n: number }>([
      { $unwind: "$touches" },
      { $match: { "touches.at": { $gte: dayStart } } },
      { $group: { _id: { channel: "$touches.channel", failed: { $ne: ["$touches.failure", null] } }, n: { $sum: 1 } } },
    ]),
  ]);

  const today = (channel: string, failed: boolean) => todayRows.find((row) => row._id.channel === channel && row._id.failed === failed)?.n ?? 0;

  return NextResponse.json({
    leads: leads.map(toSponsorLeadDTO),
    counts: Object.fromEntries(counts.map((row) => [row._id, row.n])),
    today: {
      emails: today("email", false),
      emailsFailed: today("email", true),
      whatsapp: today("whatsapp", false),
      whatsappFailed: today("whatsapp", true),
      emailCap: dailyCap(),
      whatsappCap: whatsappDailyCap(),
    },
    setup: {
      email: mailerProblem(),
      whatsapp: whatsappProblem(),
      digestTo: digestTo(),
      steps: OUTREACH_STEPS,
    },
  });
}
