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
import { z } from "zod";
import { importLeads, toRow, type LeadRow } from "@/lib/outreach/import";
import { parseCsv } from "@/lib/outreach/leadColumns";

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
      // A touch that went fine has no `failure` field at all, and a missing
      // field is "missing" in an aggregation expression, not null — so
      // `$ne: [field, null]` counts every success as a failure. `$ifNull`
      // is what actually treats absent and null the same.
      { $group: { _id: { channel: "$touches.channel", failed: { $toBool: { $ifNull: ["$touches.failure", false] } } }, n: { $sum: 1 } } },
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

/**
 * Adding leads, by hand or by pasting the sheet. This is the only way in —
 * building the list is a phone-and-Maps job done away from a laptop, so it
 * must never need a terminal or a checkout of the code.
 */
const bodySchema = z.union([
  z.object({ csv: z.string().min(1).max(500_000) }),
  z.object({
    lead: z.object({
      business: z.string().trim().min(1).max(200),
      category: z.string().trim().max(100).optional(),
      area: z.string().trim().max(100).optional(),
      ownerName: z.string().trim().max(120).optional(),
      email: z.string().trim().email().optional().or(z.literal("")),
      phone: z.string().trim().max(30).optional(),
      instagram: z.string().trim().max(120).optional(),
      sessionsInArea: z.coerce.number().int().min(0).max(10_000_000).optional(),
      lang: z.enum(["en", "gu"]).optional(),
      notes: z.string().trim().max(2000).optional(),
    }),
  }),
]);

export async function POST(request: Request) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nothing to add" }, { status: 400 });

  await connectToDatabase();
  let rows: LeadRow[];
  if ("csv" in parsed.data) {
    rows = parseCsv(parsed.data.csv).map(toRow).filter((row): row is LeadRow => row !== null);
    if (rows.length === 0) return NextResponse.json({ error: "No rows with a business name. The first line must be the column headings." }, { status: 400 });
  } else {
    const { email, ...rest } = parsed.data.lead;
    rows = [{ ...rest, email: email || undefined }];
  }

  return NextResponse.json(await importLeads(rows), { status: 201 });
}
