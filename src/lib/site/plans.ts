import { connectToDatabase } from "@/lib/db/mongodb";
import { Plan, type PlanDocument } from "@/models/Plan";
import type { Localized } from "@/types";

export interface PublicPlan {
  id: string;
  name: Localized;
  description: Localized;
  priceMonthly: number;
  priceYearly: number;
  maxSeats?: number;
  maxStaff?: number;
  whatsapp: boolean;
  highlights: Localized[];
  isPopular: boolean;
}

const empty: Localized = { en: "", gu: "" };
const text = (value: { en?: string | null; gu?: string | null } | null | undefined): Localized =>
  value ? { en: value.en ?? "", gu: value.gu ?? "" } : empty;

/**
 * The plans the website shows. Edited in HQ; a plan is only public once it's
 * ticked, so a draft plan never appears. The pricing section simply doesn't
 * render when there are none — better than inventing numbers.
 */
export async function getPublicPlans(): Promise<PublicPlan[]> {
  try {
    await connectToDatabase();
    const plans = await Plan.find({ isPublic: true, isActive: true }).sort({ sortOrder: 1 }).lean<PlanDocument[]>();
    return plans.map((plan) => ({
      id: String(plan._id),
      name: text(plan.name),
      description: text(plan.description),
      priceMonthly: plan.priceMonthly ?? 0,
      priceYearly: plan.priceYearly ?? 0,
      maxSeats: plan.maxSeats ?? undefined,
      maxStaff: plan.maxStaff ?? undefined,
      whatsapp: plan.whatsapp === true,
      highlights: (plan.highlights ?? []).map(text),
      isPopular: plan.isPopular === true,
    }));
  } catch (error) {
    // The website must still answer if the database is unreachable — it's the
    // page people find us with, and the inquiry form is what matters on it.
    console.error("[site] plans not loaded", error);
    return [];
  }
}
