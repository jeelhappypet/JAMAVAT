import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getKitchenOrders } from "@/lib/orders/queries";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";

export async function GET() {
  const staff = await requireStaff(ROLES.kitchen);
  if (staff instanceof NextResponse) return staff;

  try {
    await connectToDatabase();
    const orders = await getKitchenOrders();
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: "ઓર્ડર લાવી શકાયા નથી" }, { status: 500 });
  }
}
