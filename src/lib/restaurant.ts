import { cache } from "react";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Restaurant, type RestaurantDocument } from "@/models/Restaurant";

/** The restaurant's display name, or null before setup has saved one. Read once per request. */
export const getRestaurantName = cache(async (): Promise<string | null> => {
  await connectToDatabase();
  const restaurant = await Restaurant.findOne().lean<RestaurantDocument>();
  return restaurant?.name ?? null;
});

export async function saveRestaurantName(name: string): Promise<string> {
  await connectToDatabase();
  const saved = await Restaurant.findOneAndUpdate(
    {},
    { $set: { name } },
    { upsert: true, returnDocument: "after" }
  ).lean<RestaurantDocument>();
  return saved?.name ?? name;
}
