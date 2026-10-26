import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireHq } from "@/lib/hq/guard";
import { SponsorLead, type SponsorLeadDocument } from "@/models/SponsorLead";
import { templateCsv, toCsv } from "@/lib/outreach/import";
import { getBusinessDate } from "@/lib/utils/businessDate";

/**
 * The sheet, to fill in away from a desk and paste back.
 *
 * `?blank=1` is the empty template with two example rows. Otherwise it is
 * every lead as it stands, in the same columns, so the round trip works:
 * download, fill in the gaps on a phone or in Excel, paste it back, and the
 * importer matches each row to the lead it came from and only fills blanks.
 *
 * The bot's own state — step, status, what was already sent — is deliberately
 * not in these columns. The sheet is for contact details; nothing typed into
 * it can rewind a sequence or re-send a mail.
 */
export async function GET(request: Request) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;

  const blank = new URL(request.url).searchParams.get("blank") === "1";
  let csv: string;
  let name: string;

  if (blank) {
    csv = templateCsv();
    name = "sponsor-leads-template.csv";
  } else {
    await connectToDatabase();
    const leads = (await SponsorLead.find({}).sort({ area: 1, category: 1, business: 1 }).limit(5000).lean()) as unknown as SponsorLeadDocument[];
    csv = leads.length
      ? toCsv(
          leads.map((lead) => ({
            business: lead.business ?? "",
            category: lead.category ?? "",
            area: lead.area ?? "",
            owner_name: lead.ownerName ?? "",
            email: lead.email ?? "",
            phone: lead.phone ?? "",
            instagram: lead.instagram ?? "",
            sessions_in_area: String(lead.sessionsInArea ?? 0),
            lang: lead.lang ?? "gu",
            notes: lead.notes ?? "",
            maps_search: lead.maps ?? "",
          }))
        )
      : templateCsv();
    name = `sponsor-leads-${getBusinessDate()}.csv`;
  }

  // The byte-order mark is what makes Excel read this as UTF-8; without it
  // ગુજરાતી notes and ₹ open as mojibake and get saved back that way.
  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
