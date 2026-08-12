import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { MenuItem } from "@/models/MenuItem";
import { menuSaveSchema, menuUpdateSchema } from "@/lib/validation/menu";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import type { MenuItemDTO } from "@/types";

function toDTO(doc: {
  _id: unknown;
  name: string;
  category: string;
  price: number;
  isActive: boolean;
}): MenuItemDTO {
  return {
    id: String(doc._id),
    name: doc.name,
    category: doc.category as MenuItemDTO["category"],
    price: doc.price,
    isActive: doc.isActive,
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "1";
    const filter = activeOnly ? { isActive: true } : {};
    const items = await MenuItem.find(filter).sort({ category: 1, name: 1 }).lean();
    return NextResponse.json({ items: items.map(toDTO) });
  } catch {
    return NextResponse.json({ error: "મેનુ લાવી શકાયું નથી" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { items } = menuSaveSchema.parse(body);

    const created = await MenuItem.insertMany(
      items.map((item) => ({ ...item, isActive: item.isActive ?? true }))
    );

    emitRealtimeEvent(REALTIME_EVENTS.MENU_UPDATED, { reason: "created" });

    return NextResponse.json({ items: created.map(toDTO) }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "મેનુ સાચવી શકાયું નથી" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "મેનુ સાચવી શકાયું નથી" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { id, ...updates } = menuUpdateSchema.parse(body);

    const updated = await MenuItem.findByIdAndUpdate(id, updates, { returnDocument: "after" }).lean();
    if (!updated) {
      return NextResponse.json({ error: "આઇટમ મળી નથી" }, { status: 404 });
    }

    emitRealtimeEvent(REALTIME_EVENTS.MENU_UPDATED, { reason: "updated" });

    return NextResponse.json({ item: toDTO(updated) });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "મેનુ સાચવી શકાયું નથી" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "મેનુ સાચવી શકાયું નથી" }, { status: 500 });
  }
}
