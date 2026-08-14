import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Counter } from "@/models/Counter";
import { getBusinessDate } from "@/lib/utils/businessDate";

export async function GET() {
  try {
    await connectToDatabase();
    const businessDate = getBusinessDate();
    const counter = await Counter.findById(businessDate).lean<{ seq: number }>();

    return NextResponse.json({
      businessDate,
      tokenNumber: (counter?.seq ?? 0) + 1,
    });
  } catch {
    return NextResponse.json({ error: "ટોકન નંબર લાવી શકાયો નથી" }, { status: 500 });
  }
}
