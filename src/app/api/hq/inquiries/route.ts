import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Inquiry, type InquiryDocument } from "@/models/Inquiry";
import { requireHq } from "@/lib/hq/guard";
import { saveLead, toInquiryDTO } from "@/lib/site/inquiry";
import { leadSchema } from "@/lib/validation/inquiry";
import { getTranslator } from "@/lib/i18n/server";
import { respond } from "@/lib/api";

/** The demo requests from the website, newest first. */
export async function GET(request: Request) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const status = new URL(request.url).searchParams.get("status");
    await connectToDatabase();
    // "DUE" is the morning list: everything still open whose follow-up day has
    // come, oldest first — the one someone has been waiting longest for.
    const due = status === "DUE";
    const filter = due
      ? { status: { $in: ["NEW", "CONTACTED"] }, followUpAt: { $lte: new Date() } }
      : status && status !== "ALL"
        ? { status }
        : {};
    const inquiries = await Inquiry.find(filter)
      .sort(due ? { followUpAt: 1 } : { createdAt: -1 })
      .limit(200)
      .lean<InquiryDocument[]>();
    return NextResponse.json({ inquiries: inquiries.map(toInquiryDTO) });
  });
}

/** A lead HQ adds itself: a restaurant visited, or found on the map. */
export async function POST(request: Request) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const lead = leadSchema.parse(await request.json());
    return NextResponse.json({ inquiry: toInquiryDTO(await saveLead(lead)) }, { status: 201 });
  });
}
