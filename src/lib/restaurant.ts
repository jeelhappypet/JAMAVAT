import { cache } from "react";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Restaurant, type RestaurantDocument } from "@/models/Restaurant";
import type { RestaurantSettingsDTO } from "@/types";

/** The restaurant's display name, or null before setup has saved one. Read once per request. */
export const getRestaurantName = cache(async (): Promise<string | null> => {
  await connectToDatabase();
  const restaurant = await Restaurant.findOne().lean<RestaurantDocument>();
  return restaurant?.name ?? null;
});

/** Name plus the details printed in the thank-you email. */
export async function getRestaurantSettings(): Promise<RestaurantSettingsDTO> {
  await connectToDatabase();
  const restaurant = await Restaurant.findOne().lean<RestaurantDocument>();
  return {
    name: restaurant?.name ?? "Jamavat",
    address: restaurant?.address || undefined,
    phone: restaurant?.phone || undefined,
    reviewUrl: restaurant?.reviewUrl || undefined,
  };
}

export async function saveRestaurantName(name: string): Promise<string> {
  await connectToDatabase();
  const saved = await Restaurant.findOneAndUpdate(
    {},
    { $set: { name } },
    { upsert: true, returnDocument: "after" }
  ).lean<RestaurantDocument>();
  return saved?.name ?? name;
}

export async function saveRestaurantSettings({ name, address, phone, reviewUrl }: RestaurantSettingsDTO): Promise<RestaurantSettingsDTO> {
  await connectToDatabase();
  // Empty optional fields are removed, not stored as "".
  const unset = Object.fromEntries(
    Object.entries({ address, phone, reviewUrl })
      .filter(([, value]) => !value)
      .map(([key]) => [key, ""])
  );
  await Restaurant.findOneAndUpdate(
    {},
    { $set: { name, ...(address ? { address } : {}), ...(phone ? { phone } : {}), ...(reviewUrl ? { reviewUrl } : {}) }, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { upsert: true }
  );
  return getRestaurantSettings();
}
