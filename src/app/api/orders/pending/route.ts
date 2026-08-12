import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getKitchenOrders } from "@/lib/orders/queries";

export async function GET() {
  try {
    await connectToDatabase();
    const orders = await getKitchenOrders();
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: "ઓર્ડર લાવી શકાયા નથી" }, { status: 500 });
  }
}
