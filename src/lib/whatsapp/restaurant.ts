import { connectToDatabase } from "@/lib/db/mongodb";
import { Restaurant, type RestaurantDocument } from "@/models/Restaurant";

/**
 * Which restaurant a WhatsApp Cloud API number belongs to. HQ sets the
 * number on the restaurant; a webhook event for a number nobody owns (Meta's
 * dashboard test samples, or another business) is ignored.
 *
 * The number itself is still one shared app in the env — only the inbox data
 * is per restaurant, so a second restaurant with its own number can be added
 * by setting that id on it.
 */
export async function restaurantIdForPhoneNumber(phoneNumberId: string): Promise<string | null> {
  if (!phoneNumberId) return null;
  await connectToDatabase();
  const owner = await Restaurant.findOne({ whatsappPhoneNumberId: phoneNumberId }).select({ _id: 1 }).lean<Pick<RestaurantDocument, "_id">>();
  return owner ? String(owner._id) : null;
}
