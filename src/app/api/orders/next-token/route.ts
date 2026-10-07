import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Counter } from "@/models/Counter";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";

export async function GET() {
  const staff = await requireStaff(ROLES.counter);
  if (staff instanceof NextResponse) return staff;

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
