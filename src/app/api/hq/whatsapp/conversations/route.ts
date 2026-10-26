import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireHq } from "@/lib/hq/guard";
import { listConversations } from "@/lib/whatsapp/inbox";
import { Restaurant } from "@/models/Restaurant";

/**
 * Every restaurant's chats in one list. One WhatsApp number serves them all,
 * so from HQ the per-restaurant split is a filing detail — each row says
 * which restaurant it belongs to instead of making someone pick one first.
 */
export async function GET(request: Request) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;

  await connectToDatabase();
  const q = new URL(request.url).searchParams.get("q")?.trim() || undefined;
  const [conversations, restaurants] = await Promise.all([
    listConversations(null, q),
    // The channels HQ subscribes to. Sent with the list so the screen does
    // not need a second round trip just to know what to listen on.
    Restaurant.find({}).select({ _id: 1 }).lean<{ _id: unknown }[]>(),
  ]);
  return NextResponse.json({ conversations, restaurantIds: restaurants.map((one) => String(one._id)) });
}
