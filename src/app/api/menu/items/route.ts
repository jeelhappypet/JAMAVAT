import { NextResponse } from "next/server";
import { Category } from "@/models/Category";
import { MenuItem } from "@/models/MenuItem";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { itemCreateSchema } from "@/lib/validation/menu";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

export async function POST(request: Request) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { categoryId, name, nameGu, description, descriptionGu, isBestseller, price, isVeg } = itemCreateSchema.parse(await request.json());
    if (!(await Category.exists({ _id: categoryId }))) return jsonError(t("err.notFound"), 404);
    const item = await MenuItem.create({
      categoryId,
      name,
      nameGu: nameGu || undefined,
      description: description || undefined,
      descriptionGu: descriptionGu || undefined,
      isBestseller: isBestseller ?? false,
      price,
      isVeg: isVeg ?? true,
    });
    await emitRealtimeEvent(REALTIME_EVENTS.MENU_UPDATED, { reason: "item-created" });
    return NextResponse.json({ id: String(item._id) }, { status: 201 });
  });
}
