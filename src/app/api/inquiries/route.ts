import { NextResponse, type NextRequest } from "next/server";
import { inquirySchema } from "@/lib/validation/inquiry";
import { notifyHq, saveInquiry, tooManyFrom } from "@/lib/site/inquiry";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

/**
 * "Book a free demo" from the Jamavat website — public, so it is guarded
 * three ways: a hidden honeypot field no person fills, a per-address hourly
 * limit, and a de-dupe on the phone number (see saveInquiry). A bot that
 * trips the honeypot gets the same answer as a person, so it learns nothing.
 */
export async function POST(request: NextRequest) {
  const t = await getTranslator();
  return respond(t, "err.inquiryFailed", async () => {
    const input = inquirySchema.parse(await request.json());
    if (input.website) return NextResponse.json({ ok: true });

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (tooManyFrom(ip)) return jsonError(t("err.inquiryTooMany"), 429);

    const inquiry = await saveInquiry(input);
    // Awaited on purpose: a Vercel function can be frozen the moment it responds.
    await notifyHq(inquiry);
    return NextResponse.json({ ok: true }, { status: 201 });
  });
}
