import { cache } from "react";
import { connectToDatabase } from "@/lib/db/mongodb";
import type { RestaurantRef } from "@/lib/db/tenant";
import { Restaurant, type RestaurantDocument } from "@/models/Restaurant";
import type { BillingCycle, GstMode, GstSettingsDTO, RestaurantSettingsDTO, RestaurantStatus } from "@/types";

/** What most requests need about a restaurant: who it is and whether it may take orders. */
export interface RestaurantInfo {
  id: string;
  slug: string;
  name: string;
  status: RestaurantStatus;
  planId?: string;
  billingCycle: BillingCycle;
  paidUntil?: Date;
  graceDays: number;
  whatsappPhoneNumberId?: string;
  /** Settling a bill and the guest's own total both need the tax rate. */
  gst: GstSettingsDTO;
}

const INFO_FIELDS = { name: 1, slug: 1, status: 1, planId: 1, billingCycle: 1, paidUntil: 1, graceDays: 1, whatsappPhoneNumberId: 1, gstEnabled: 1, gstPercent: 1, gstMode: 1, gstin: 1 };
type InfoDoc = Pick<
  RestaurantDocument,
  "_id" | "name" | "slug" | "status" | "planId" | "billingCycle" | "paidUntil" | "graceDays" | "whatsappPhoneNumberId" | "gstEnabled" | "gstPercent" | "gstMode" | "gstin"
>;

/** A restaurant that has never been near the GST fields pays no tax. */
function toGst(doc: Pick<InfoDoc, "gstEnabled" | "gstPercent" | "gstMode" | "gstin">): GstSettingsDTO {
  return {
    enabled: doc.gstEnabled === true,
    percent: doc.gstPercent ?? 0,
    mode: (doc.gstMode ?? "CGST_SGST") as GstMode,
    gstin: doc.gstin || undefined,
  };
}

function toInfo(doc: InfoDoc): RestaurantInfo {
  return {
    id: String(doc._id),
    slug: doc.slug,
    name: doc.name,
    status: (doc.status ?? "ACTIVE") as RestaurantStatus,
    planId: doc.planId ? String(doc.planId) : undefined,
    billingCycle: (doc.billingCycle ?? "MONTHLY") as BillingCycle,
    paidUntil: doc.paidUntil ?? undefined,
    graceDays: doc.graceDays ?? 7,
    whatsappPhoneNumberId: doc.whatsappPhoneNumberId || undefined,
    gst: toGst(doc),
  };
}

/**
 * Every staff API call needs its restaurant's slug and status, so instances
 * keep them for a few seconds instead of reading Mongo each time. HQ changes
 * (suspend, renew) reach every instance within INFO_TTL_MS.
 */
const INFO_TTL_MS = 15_000;
const infoMemo = new Map<string, { at: number; value: RestaurantInfo | null }>();

export async function getRestaurantInfo(id: RestaurantRef): Promise<RestaurantInfo | null> {
  const key = String(id);
  const hit = infoMemo.get(key);
  if (hit && Date.now() - hit.at < INFO_TTL_MS) return hit.value;
  await connectToDatabase();
  const doc = await Restaurant.findById(key).select(INFO_FIELDS).lean<InfoDoc>();
  const value = doc ? toInfo(doc) : null;
  infoMemo.set(key, { at: Date.now(), value });
  return value;
}

/** Call after HQ or an admin changes a restaurant, so this instance doesn't serve the old copy. */
export function forgetRestaurantInfo(id: RestaurantRef) {
  infoMemo.delete(String(id));
}

/**
 * `/r/{slug}` → the restaurant. A slug HQ has since renamed still resolves
 * (`movedTo` is then the current one, for a redirect). One read per request.
 */
export const getRestaurantBySlug = cache(async (slug: string): Promise<{ restaurant: RestaurantInfo; movedTo?: string } | null> => {
  const clean = slug.toLowerCase();
  if (!/^[a-z0-9-]{1,60}$/.test(clean)) return null;
  await connectToDatabase();
  const doc = await Restaurant.findOne({ $or: [{ slug: clean }, { previousSlugs: clean }] })
    .select(INFO_FIELDS)
    .lean<InfoDoc>();
  if (!doc) return null;
  const restaurant = toInfo(doc);
  return restaurant.slug === clean ? { restaurant } : { restaurant, movedTo: restaurant.slug };
});

/** The restaurant's display name. Read once per request. */
export const getRestaurantName = cache(async (id: RestaurantRef): Promise<string | null> => {
  return (await getRestaurantInfo(id))?.name ?? null;
});

/** Name plus the details printed on the invoice: footer, review link and GST. */
export async function getRestaurantSettings(id: RestaurantRef): Promise<RestaurantSettingsDTO> {
  await connectToDatabase();
  const restaurant = await Restaurant.findById(id)
    .select({ name: 1, address: 1, phone: 1, reviewUrl: 1, gstEnabled: 1, gstPercent: 1, gstMode: 1, gstin: 1 })
    .lean<RestaurantDocument>();
  return {
    name: restaurant?.name ?? "Jamavat",
    address: restaurant?.address || undefined,
    phone: restaurant?.phone || undefined,
    reviewUrl: restaurant?.reviewUrl || undefined,
    gst: restaurant ? toGst(restaurant) : { enabled: false, percent: 0, mode: "CGST_SGST" },
  };
}

export async function saveRestaurantSettings(id: RestaurantRef, { name, address, phone, reviewUrl, gst }: RestaurantSettingsDTO): Promise<RestaurantSettingsDTO> {
  await connectToDatabase();
  // Empty optional fields are removed, not stored as "".
  const unset = Object.fromEntries(
    Object.entries({ address, phone, reviewUrl, gstin: gst.gstin })
      .filter(([, value]) => !value)
      .map(([key]) => [key, ""])
  );
  await Restaurant.updateOne(
    { _id: id },
    {
      $set: {
        name,
        ...(address ? { address } : {}),
        ...(phone ? { phone } : {}),
        ...(reviewUrl ? { reviewUrl } : {}),
        // The rate and the mode are kept even when GST is switched off, so
        // switching it back on doesn't ask the owner to fill them in again.
        gstEnabled: gst.enabled,
        gstPercent: gst.percent,
        gstMode: gst.mode,
        ...(gst.gstin ? { gstin: gst.gstin } : {}),
      },
      ...(Object.keys(unset).length ? { $unset: unset } : {}),
    }
  );
  forgetRestaurantInfo(id);
  return getRestaurantSettings(id);
}
