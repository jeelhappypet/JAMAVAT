import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { describeKitchenScope, getKitchenScope, getKitchenTickets } from "@/lib/orders/kitchen";
import { getTranslator } from "@/lib/i18n/server";
import { respond } from "@/lib/api";

/** The calling kitchen screen's tickets: only its own categories' items that still need cooking. */
export async function GET() {
  const staff = await requireStaff(ROLES.kitchen);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.ordersLoad", async () => {
    const scope = await getKitchenScope(staff);
    const [tickets, scopeInfo] = await Promise.all([getKitchenTickets(scope), describeKitchenScope(scope)]);
    return NextResponse.json({ tickets, scope: scopeInfo });
  });
}
