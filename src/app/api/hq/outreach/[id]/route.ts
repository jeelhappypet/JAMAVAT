import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireHq } from "@/lib/hq/guard";
import { SponsorLead, type SponsorLeadDocument } from "@/models/SponsorLead";
import { toSponsorLeadDTO } from "@/lib/outreach/dto";
import { OUTREACH_STEPS, dueAt, nextRunnable } from "@/lib/outreach/sequence";

/**
 * What HQ can do to one lead by hand. An email reply is the one thing the bot
 * cannot notice — nothing reads the inbox — so marking it here is what stops
 * a follow-up landing on top of someone who already answered.
 */
const patchSchema = z.object({
  status: z.enum(["ACTIVE", "REPLIED", "WON", "DEAD"]).optional(),
  notes: z.string().trim().max(2000).optional(),
  /** Say the WhatsApp or the visit was done, so the sequence moves on today. */
  didStep: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nothing to change" }, { status: 400 });

  await connectToDatabase();
  const { id } = await params;
  const lead = (await SponsorLead.findById(id).lean()) as unknown as SponsorLeadDocument | null;
  if (!lead) return NextResponse.json({ error: "That lead is gone" }, { status: 404 });

  const now = new Date();
  const set: Record<string, unknown> = {};
  const push: Record<string, unknown> = {};

  if (parsed.data.notes !== undefined) set.notes = parsed.data.notes;

  if (parsed.data.status) {
    set.status = parsed.data.status;
    if (parsed.data.status === "ACTIVE") {
      set.nextActionAt = now;
      set.closedReason = null;
    } else {
      // Anything but ACTIVE is an ending: the bot must not pick it up again.
      set.nextActionAt = null;
      set.manualSince = null;
      set.closedReason = parsed.data.status === "REPLIED" ? "replied" : parsed.data.status === "WON" ? "won" : "closed by hand";
      if (parsed.data.status === "REPLIED" && !lead.repliedAt) set.repliedAt = now;
    }
  }

  if (parsed.data.didStep) {
    const index = nextRunnable(lead.step, lead) ?? lead.step;
    const step = OUTREACH_STEPS[index];
    const startedAt = lead.touches[0]?.at ?? lead.createdAt;
    const after = nextRunnable(index + 1, lead);
    const at = after === null ? null : dueAt(startedAt, after);
    push.touches = { channel: step?.channel ?? "visit", step: index, at: now, summary: "Done by hand" };
    if (after === null || !at) {
      set.status = "DEAD";
      set.closedReason = "ran out of steps";
      set.nextActionAt = null;
    } else {
      set.step = after;
      set.nextActionAt = at;
    }
    set.manualSince = null;
  }

  const updated = (await SponsorLead.findByIdAndUpdate(
    id,
    { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(push).length ? { $push: push } : {}) },
    { new: true }
  ).lean()) as unknown as SponsorLeadDocument | null;

  if (!updated) return NextResponse.json({ error: "That lead is gone" }, { status: 404 });
  return NextResponse.json({ lead: toSponsorLeadDTO(updated) });
}
