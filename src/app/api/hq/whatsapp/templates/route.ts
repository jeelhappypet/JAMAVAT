import { NextResponse } from "next/server";
import { requireHq } from "@/lib/hq/guard";
import { getSendConfig } from "@/lib/whatsapp/config";
import { listTemplates } from "@/lib/whatsapp/graph";

/**
 * The templates on the WhatsApp Business Account. HQ needs them because a
 * chat whose 24-hour window has closed can only be reopened with one.
 */
export async function GET() {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;

  const config = getSendConfig();
  const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
  if (!config || !waba) return NextResponse.json({ templates: [], error: "WhatsApp isn't fully configured on the server." });

  return NextResponse.json({ templates: await listTemplates(config, waba) });
}
