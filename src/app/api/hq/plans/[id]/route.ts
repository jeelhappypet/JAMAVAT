import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Plan, type PlanDocument } from "@/models/Plan";
import { Restaurant } from "@/models/Restaurant";
import { requireHq } from "@/lib/hq/guard";
import { planSchema } from "@/lib/validation/hq";
import { toPlanDTO } from "../route";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    const input = planSchema.partial().parse(await request.json());

    await connectToDatabase();
    const set: Record<string, unknown> = { ...input };
    const unset: Record<string, string> = {};
    // An empty limit means unlimited, so it's removed rather than stored as 0.
    for (const key of ["maxSeats", "maxStaff"] as const) {
      if (input[key] === null) {
        delete set[key];
        unset[key] = "";
      }
    }

    const updated = await Plan.findByIdAndUpdate(
      id,
      { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { returnDocument: "after" }
    ).lean<PlanDocument>();
    if (!updated) return jsonError(t("err.notFound"), 404);
    return NextResponse.json({ plan: toPlanDTO(updated, await Restaurant.countDocuments({ planId: id })) });
  });
}

/** Only a plan nobody is on can be deleted; the rest are archived (isActive false) instead. */
export async function DELETE(_request: Request, { params }: Params) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    await connectToDatabase();
    if (await Restaurant.exists({ planId: id })) return jsonError("Restaurants are on this plan — archive it instead", 409);
    const deleted = await Plan.findByIdAndDelete(id).lean();
    return deleted ? NextResponse.json({ ok: true }) : jsonError(t("err.notFound"), 404);
  });
}
