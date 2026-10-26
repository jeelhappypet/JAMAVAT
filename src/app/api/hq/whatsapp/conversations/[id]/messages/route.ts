import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireHq } from "@/lib/hq/guard";
import { loadChat } from "@/lib/whatsapp/inbox";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;

  await connectToDatabase();
  const { id } = await params;
  const before = new URL(request.url).searchParams.get("before") || undefined;
  const chat = await loadChat(null, id, before);
  return chat ? NextResponse.json(chat) : NextResponse.json({ error: "That chat is gone" }, { status: 404 });
}
