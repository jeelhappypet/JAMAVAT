import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getCounterOrders } from "@/lib/orders/queries";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";

export async function GET() {
  const staff = await requireStaff(ROLES.counter);
  if (staff instanceof NextResponse) return staff;

  try {
    await connectToDatabase();
    const orders = await getCounterOrders();
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: (await getTranslator())("err.ordersLoad") }, { status: 500 });
  }
}
