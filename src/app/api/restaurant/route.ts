import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { restaurantSchema } from "@/lib/validation/staff";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { saveRestaurantName } from "@/lib/restaurant";
import { getTranslator } from "@/lib/i18n/server";
import { zodErrorMessage } from "@/lib/i18n/zod";

export async function PATCH(request: Request) {
  const current = await requireStaff(ROLES.admin);
  if (current instanceof NextResponse) return current;
  const t = await getTranslator();

  try {
    const { restaurantName } = restaurantSchema.parse(await request.json());
    const name = await saveRestaurantName(restaurantName);
    return NextResponse.json({ restaurantName: name });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: zodErrorMessage(error, t) }, { status: 400 });
    }
    return NextResponse.json({ error: t("err.saveFailed") }, { status: 500 });
  }
}
