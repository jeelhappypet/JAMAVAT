import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Inquiry, type InquiryDocument } from "@/models/Inquiry";
import { requireHq } from "@/lib/hq/guard";
import { toInquiryDTO } from "@/lib/site/inquiry";
import { updateInquirySchema } from "@/lib/validation/hq";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    const patch = updateInquirySchema.parse(await request.json());

    await connectToDatabase();
    const updated = await Inquiry.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(patch.status ? { status: patch.status } : {}),
          ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
          // "Contacted" remembers when, so a lead that's been sitting shows.
          ...(patch.status === "CONTACTED" ? { contactedAt: new Date() } : {}),
        },
      },
      { returnDocument: "after" }
    ).lean<InquiryDocument>();
    return updated ? NextResponse.json({ inquiry: toInquiryDTO(updated) }) : jsonError(t("err.notFound"), 404);
  });
}
