import { NextResponse } from "next/server";
import { requireHq } from "@/lib/hq/guard";
import { getSendConfig } from "@/lib/whatsapp/config";
import { uploadMedia } from "@/lib/whatsapp/graph";

/** WhatsApp's own limit for an image; anything bigger is refused by Meta anyway. */
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Puts a photo on Meta's media store and hands back its id, which the send
 * route then references. The file never lands in Jamavat's own storage —
 * WhatsApp keeps it for 30 days and the chat only stores the id.
 */
export async function POST(request: Request) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;

  const config = getSendConfig();
  if (!config) return NextResponse.json({ error: "WhatsApp sending isn't set up on the server." }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Pick a photo to send." }, { status: 400 });
  if (!TYPES.includes(file.type)) return NextResponse.json({ error: "Only JPEG, PNG or WebP photos." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That photo is over 5 MB." }, { status: 400 });

  const uploaded = await uploadMedia(config, file, file.name || "photo.jpg");
  if (!uploaded.ok) return NextResponse.json({ error: uploaded.error }, { status: 502 });
  return NextResponse.json({ mediaId: uploaded.mediaId });
}
