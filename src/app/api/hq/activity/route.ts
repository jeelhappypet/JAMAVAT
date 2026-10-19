import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { ActivityLog, type ActivityLogDocument } from "@/models/ActivityLog";
import { requireHq } from "@/lib/hq/guard";
import { getTranslator } from "@/lib/i18n/server";
import { respond } from "@/lib/api";
import type { ActivityLogDTO } from "@/types";

const PAGE_SIZE = 30;

function toDTO(doc: ActivityLogDocument): ActivityLogDTO {
  return {
    id: String(doc._id),
    hqEmail: doc.hqEmail,
    action: doc.action,
    summary: doc.summary,
    restaurantId: doc.restaurantId ? String(doc.restaurantId) : undefined,
    restaurantName: doc.restaurantName || undefined,
    createdAt: doc.createdAt.toISOString(),
  };
}

/** The Activity panel's feed — newest first, 30 at a time. `cursor` is the last id seen, so a slow-scrolling HQ admin never skips or repeats a row even as new ones land. */
export async function GET(request: Request) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const cursor = new URL(request.url).searchParams.get("cursor");
    await connectToDatabase();
    const filter = cursor && isValidObjectId(cursor) ? { _id: { $lt: cursor } } : {};
    const rows = await ActivityLog.find(filter).sort({ _id: -1 }).limit(PAGE_SIZE).lean<ActivityLogDocument[]>();
    const nextCursor = rows.length === PAGE_SIZE ? String(rows[rows.length - 1]._id) : null;
    return NextResponse.json({ entries: rows.map(toDTO), nextCursor });
  });
}
