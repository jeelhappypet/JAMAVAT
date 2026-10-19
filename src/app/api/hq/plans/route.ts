import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Plan, type PlanDocument } from "@/models/Plan";
import { Restaurant } from "@/models/Restaurant";
import { requireHq } from "@/lib/hq/guard";
import { planSchema } from "@/lib/validation/hq";
import { getTranslator } from "@/lib/i18n/server";
import { respond } from "@/lib/api";
import { refreshPlanPages } from "@/lib/site/plans";
import type { Localized, PlanDTO } from "@/types";

const text = (value: { en?: string | null; gu?: string | null } | null | undefined): Localized => ({ en: value?.en ?? "", gu: value?.gu ?? "" });

export function toPlanDTO(doc: PlanDocument, restaurantCount = 0): PlanDTO {
  return {
    id: String(doc._id),
    name: text(doc.name),
    description: text(doc.description),
    priceMonthly: doc.priceMonthly ?? 0,
    priceYearly: doc.priceYearly ?? 0,
    maxSeats: doc.maxSeats ?? undefined,
    maxStaff: doc.maxStaff ?? undefined,
    whatsapp: doc.whatsapp === true,
    highlights: (doc.highlights ?? []).map(text),
    isPublic: doc.isPublic === true,
    isPopular: doc.isPopular === true,
    isActive: doc.isActive !== false,
    sortOrder: doc.sortOrder ?? 0,
    restaurantCount,
  };
}

export async function GET() {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    await connectToDatabase();
    const [plans, counts] = await Promise.all([
      Plan.find().sort({ sortOrder: 1, createdAt: 1 }).lean<PlanDocument[]>(),
      Restaurant.aggregate<{ _id: unknown; count: number }>([{ $match: { planId: { $ne: null } } }, { $group: { _id: "$planId", count: { $sum: 1 } } }]),
    ]);
    const used = new Map(counts.map((row) => [String(row._id), row.count]));
    return NextResponse.json({ plans: plans.map((plan) => toPlanDTO(plan, used.get(String(plan._id)) ?? 0)) });
  });
}

export async function POST(request: Request) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const input = planSchema.parse(await request.json());
    await connectToDatabase();
    const created = await Plan.create({
      ...input,
      maxSeats: input.maxSeats ?? undefined,
      maxStaff: input.maxStaff ?? undefined,
    });
    refreshPlanPages();
    return NextResponse.json({ plan: toPlanDTO(created.toObject()) }, { status: 201 });
  });
}
