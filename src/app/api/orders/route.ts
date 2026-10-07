import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { MenuItem, type MenuItemDocument } from "@/models/MenuItem";
import { Category, type CategoryDocument } from "@/models/Category";
import { Order } from "@/models/Order";
import { Counter } from "@/models/Counter";
import { createOrderSchema } from "@/lib/validation/order";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { serializeOrder, type OrderLean } from "@/lib/orders/serialize";
import { ensureMenuStructure } from "@/lib/menu/structure";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";
import { isDuplicateKeyError, jsonError } from "@/lib/api";

export async function POST(request: NextRequest) {
  const staff = await requireStaff(ROLES.counter);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  try {
    await connectToDatabase();
    const body = await request.json();
    const { customerName, items, clientRequestId } = createOrderSchema.parse(body);

    const existing = await Order.findOne({ clientRequestId }).lean<OrderLean>();
    if (existing) {
      return NextResponse.json(serializeOrder(existing), { status: 200 });
    }

    // v1 items get their categoryId here on first use, so routing works for them too.
    await ensureMenuStructure();
    const menuItemIds = items.map((item) => item.menuItemId);
    if (!menuItemIds.every(isValidObjectId)) return jsonError(t("err.itemMissing"), 400);

    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } }).lean<MenuItemDocument[]>();
    const menuItemById = new Map(menuItems.map((item) => [String(item._id), item]));
    const categories = await Category.find({ _id: { $in: menuItems.map((item) => item.categoryId) } }).lean<CategoryDocument[]>();
    const categoryById = new Map(categories.map((category) => [String(category._id), category]));

    const orderItems = [];
    for (const item of items) {
      const menuItem = menuItemById.get(item.menuItemId);
      if (!menuItem || menuItem.isActive === false) return jsonError(t("err.itemMissing"), 400);
      if (menuItem.isAvailable === false) return jsonError(t("err.itemSoldOut", { name: menuItem.name }), 409);
      const category = categoryById.get(String(menuItem.categoryId));
      orderItems.push({
        menuItemId: menuItem._id,
        nameSnapshot: menuItem.name,
        nameGuSnapshot: menuItem.nameGu || undefined,
        categoryId: menuItem.categoryId,
        categorySnapshot: category?.name ?? menuItem.category ?? "",
        quantity: item.quantity,
        unitPrice: menuItem.price,
        lineTotal: menuItem.price * item.quantity,
        status: "PENDING",
      });
    }

    const totalAmount = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const businessDate = getBusinessDate();

    const counter = await Counter.findOneAndUpdate(
      { _id: businessDate },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );

    let created;
    try {
      created = await Order.create({
        tokenNumber: counter.seq,
        businessDate,
        customerName: customerName || undefined,
        items: orderItems,
        totalAmount,
        status: "PENDING",
        clientRequestId,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const raced = await Order.findOne({ clientRequestId }).lean<OrderLean>();
        if (raced) return NextResponse.json(serializeOrder(raced), { status: 200 });
      }
      throw error;
    }

    const dto = serializeOrder(created.toObject());

    await Promise.all([
      emitRealtimeEvent(REALTIME_EVENTS.ORDER_CREATED, dto),
      emitRealtimeEvent(REALTIME_EVENTS.ADMIN_STATS_UPDATED, { reason: "order:created" }),
    ]);

    return NextResponse.json(dto, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "ઓર્ડર મોકલી શકાયો નથી" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "ઓર્ડર મોકલી શકાયો નથી" }, { status: 500 });
  }
}
