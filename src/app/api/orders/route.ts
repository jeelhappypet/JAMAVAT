import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { MenuItem } from "@/models/MenuItem";
import { Order } from "@/models/Order";
import { Counter } from "@/models/Counter";
import { createOrderSchema } from "@/lib/validation/order";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { serializeOrder } from "@/lib/orders/serialize";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { customerName, items, clientRequestId } = createOrderSchema.parse(body);

    const existing = await Order.findOne({ clientRequestId }).lean();
    if (existing) {
      return NextResponse.json(serializeOrder(existing), { status: 200 });
    }

    const menuItemIds = items.map((item) => item.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } }).lean();
    const menuItemById = new Map(menuItems.map((item) => [String(item._id), item]));

    const orderItems = items.map((item) => {
      const menuItem = menuItemById.get(item.menuItemId);
      if (!menuItem) {
        throw new Error("મેનુ આઇટમ મળી નથી");
      }
      const lineTotal = menuItem.price * item.quantity;
      return {
        menuItemId: menuItem._id,
        nameSnapshot: menuItem.name,
        categorySnapshot: menuItem.category,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        lineTotal,
      };
    });

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
        const raced = await Order.findOne({ clientRequestId }).lean();
        if (raced) return NextResponse.json(serializeOrder(raced), { status: 200 });
      }
      throw error;
    }

    const dto = serializeOrder(created.toObject());

    emitRealtimeEvent(REALTIME_EVENTS.ORDER_CREATED, dto);
    emitRealtimeEvent(REALTIME_EVENTS.ADMIN_STATS_UPDATED, { reason: "order:created" });

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
