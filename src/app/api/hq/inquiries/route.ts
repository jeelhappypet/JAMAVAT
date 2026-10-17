import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Inquiry, type InquiryDocument } from "@/models/Inquiry";
import { requireHq } from "@/lib/hq/guard";
import { toInquiryDTO } from "@/lib/site/inquiry";
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
    const inquiries = await Inquiry.find(status && status !== "ALL" ? { status } : {})
      .sort({ createdAt: -1 })
      .limit(200)
      .lean<InquiryDocument[]>();
    return NextResponse.json({ inquiries: inquiries.map(toInquiryDTO) });
  });
}
