import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { Order } from "@/models/Order";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getKitchenScope, isInScope } from "@/lib/orders/kitchen";
import { itemStatus, serializeOrder, type OrderLean } from "@/lib/orders/serialize";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

/**
 * A kitchen marks ITS items of an order ready (admin: every item). The
 * order itself turns READY only once no item anywhere is still pending, so
 * two kitchens sharing one order each finish their own part. Kitchens have
 * no cancel action — that stays with the counter.
 */
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(ROLES.kitchen);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.readyFailed", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.alreadyProcessed"), 409);

    const scope = await getKitchenScope(staff);
    const order = await Order.findOne({ _id: id, status: "PENDING" }).lean<OrderLean>();
    if (!order) return jsonError(t("err.alreadyProcessed"), 409);

    const mine = order.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => itemStatus(item, order.status) === "PENDING" && isInScope(item, scope))
      .map(({ index }) => index);
    if (mine.length === 0) return jsonError(t("err.alreadyProcessed"), 409);

    const now = new Date();
    // Conditioned on exactly these items still being pending, so a double
    // tap (or two devices on the same kitchen) can't both "win".
    const marked = await Order.findOneAndUpdate(
      { _id: id, status: "PENDING", ...Object.fromEntries(mine.map((i) => [`items.${i}.status`, { $ne: "READY" }])) },
      { $set: Object.fromEntries(mine.flatMap((i) => [[`items.${i}.status`, "READY"], [`items.${i}.readyAt`, now]])) },
      { returnDocument: "after" }
    ).lean<OrderLean>();
    if (!marked) return jsonError(t("err.alreadyProcessed"), 409);

    // Whoever marks the last pending item flips the whole order — atomically,
    // in case two kitchens finish at the same moment.
    const finished = await Order.findOneAndUpdate(
      { _id: id, status: "PENDING", items: { $not: { $elemMatch: { status: { $ne: "READY" } } } } },
      { $set: { status: "READY", readyAt: now } },
      { returnDocument: "after" }
    ).lean<OrderLean>();

    const dto = serializeOrder(finished ?? marked);
    await emitRealtimeEvent(REALTIME_EVENTS.ORDER_ITEMS_READY, { id: dto.id, items: dto.items.map((i) => i.status) });
    if (finished) {
      await emitRealtimeEvent(REALTIME_EVENTS.ORDER_READY, { id: dto.id, tokenNumber: dto.tokenNumber, businessDate: dto.businessDate });
    }
    return NextResponse.json(dto);
  });
}
