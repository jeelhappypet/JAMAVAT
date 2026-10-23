import { NextResponse } from "next/server";
import { restaurantSchema } from "@/lib/validation/staff";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { saveRestaurantSettings } from "@/lib/restaurant";
import { getTranslator } from "@/lib/i18n/server";
import { respond } from "@/lib/api";

/** Restaurant name, the details printed on the invoice (address, phone, review link) and GST. */
export async function PATCH(request: Request) {
  const current = await requireStaff(ROLES.admin);
  if (current instanceof NextResponse) return current;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { restaurantName, address, phone, reviewUrl, gst } = restaurantSchema.parse(await request.json());
    const saved = await saveRestaurantSettings(current.restaurantId, { name: restaurantName, address, phone, reviewUrl, gst });
    return NextResponse.json({ restaurantName: saved.name, ...saved });
  });
}
