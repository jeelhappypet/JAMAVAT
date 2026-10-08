import { NextResponse } from "next/server";
import { restaurantSchema } from "@/lib/validation/staff";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { saveRestaurantSettings } from "@/lib/restaurant";
import { getTranslator } from "@/lib/i18n/server";
import { respond } from "@/lib/api";

/** Restaurant name + the address, phone and Google review link used in the thank-you email. */
export async function PATCH(request: Request) {
  const current = await requireStaff(ROLES.admin);
  if (current instanceof NextResponse) return current;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { restaurantName, address, phone, reviewUrl } = restaurantSchema.parse(await request.json());
    const saved = await saveRestaurantSettings({ name: restaurantName, address, phone, reviewUrl });
    return NextResponse.json({ restaurantName: saved.name, ...saved });
  });
}
