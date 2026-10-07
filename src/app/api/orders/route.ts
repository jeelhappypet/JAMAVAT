import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Order } from "@/models/Order";
import { createOrderSchema } from "@/lib/validation/order";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { serializeOrder, type OrderLean } from "@/lib/orders/serialize";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";
import { isDuplicateKeyError, jsonError } from "@/lib/api";
import { buildOrderItems, nextTokenNumber } from "@/lib/orders/build";

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

    const built = await buildOrderItems(items, t);
    if (!built.ok) return jsonError(built.error, built.status);
    const businessDate = getBusinessDate();
    const tokenNumber = await nextTokenNumber(businessDate);

    let created;
    try {
      created = await Order.create({
        tokenNumber,
        businessDate,
        source: "COUNTER",
        customerName: customerName || undefined,
        items: built.items,
        totalAmount: built.totalAmount,
        status: "PENDING",
        acceptedAt: new Date(),
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
