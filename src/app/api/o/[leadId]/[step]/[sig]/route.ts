import { connectToDatabase } from "@/lib/db/mongodb";
import { SponsorLead } from "@/models/SponsorLead";
import { PIXEL, isValidOpen } from "@/lib/outreach/tracking";

/**
 * The tracking pixel at the bottom of an outreach email. It always answers
 * with the image, whatever happens — a broken image in a sales mail looks
 * like a scam, and a 404 would be visible to the sponsor.
 *
 * `lib/outreach/tracking.ts` explains why this is a guess and not a receipt.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ leadId: string; step: string; sig: string }> }) {
  const { leadId, step, sig } = await params;
  const stepIndex = Number(step);
  const signature = sig.replace(/\.gif$/, "");

  if (Number.isInteger(stepIndex) && isValidOpen(leadId, stepIndex, signature)) {
    try {
      await connectToDatabase();
      // First open only: a mail re-opened a week later should not look newer
      // than it is, and Gmail's proxy re-fetches the same pixel for years.
      await SponsorLead.updateOne(
        { _id: leadId, touches: { $elemMatch: { step: stepIndex, channel: "email", readAt: null } } },
        { $set: { "touches.$.readAt": new Date() } }
      );
    } catch {
      /* The image matters more than the count. */
    }
  }

  return new Response(new Uint8Array(PIXEL), {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
