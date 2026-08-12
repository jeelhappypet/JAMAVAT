import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Order } from "@/models/Order";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

interface StatusCount {
  _id: string;
  count: number;
}

interface TodayFacet {
  orders: number;
  revenue: number;
}

interface DateWiseFacet {
  _id: string;
  orders: number;
  completed: number;
  cancelled: number;
  revenue: number;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: "લોગિન જરૂરી છે" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const businessDate = getBusinessDate();

    const [result] = await Order.aggregate<{
      totals: StatusCount[];
      today: TodayFacet[];
      dateWise: DateWiseFacet[];
    }>([
      {
        $facet: {
          totals: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          today: [
            { $match: { businessDate } },
            {
              $group: {
                _id: null,
                orders: { $sum: 1 },
                revenue: {
                  $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, "$totalAmount", 0] },
                },
              },
            },
          ],
          dateWise: [
            {
              $group: {
                _id: "$businessDate",
                orders: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] } },
                revenue: {
                  $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, "$totalAmount", 0] },
                },
              },
            },
            { $sort: { _id: -1 } },
            { $limit: 30 },
          ],
        },
      },
    ]);

    const totalsByStatus = Object.fromEntries(result.totals.map((t) => [t._id, t.count]));
    const totalOrders = result.totals.reduce((sum, t) => sum + t.count, 0);

    return NextResponse.json({
      totalOrders,
      completedOrders: totalsByStatus.COMPLETED ?? 0,
      cancelledOrders: totalsByStatus.CANCELLED ?? 0,
      pendingOrders: totalsByStatus.PENDING ?? 0,
      todayOrders: result.today[0]?.orders ?? 0,
      todayRevenue: result.today[0]?.revenue ?? 0,
      dateWise: result.dateWise.map((d) => ({
        businessDate: d._id,
        orders: d.orders,
        completed: d.completed,
        cancelled: d.cancelled,
        revenue: d.revenue,
      })),
    });
  } catch {
    return NextResponse.json({ error: "આંકડા લાવી શકાયા નથી" }, { status: 500 });
  }
}
