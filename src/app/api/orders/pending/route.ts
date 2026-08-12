import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getActiveOrders } from "@/lib/orders/queries";

export async function GET() {
  try {
    await connectToDatabase();
    const orders = await getActiveOrders();
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: "ઓર્ડર લાવી શકાયા નથી" }, { status: 500 });
  }
}
