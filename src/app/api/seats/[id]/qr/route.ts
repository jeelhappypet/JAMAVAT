import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";
import { isValidObjectId } from "mongoose";
import { Seat, type SeatDocument } from "@/models/Seat";
import { Table, type TableDocument } from "@/models/Table";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getBaseUrl, guestUrl, seatCode } from "@/lib/tables";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getRestaurantName } from "@/lib/restaurant";
import { renderQrSticker } from "@/lib/qrSticker";

/** One seat's QR sticker as a downloadable SVG — true-to-size on paper (62 × 88 mm), sharp at any zoom. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;

  const { id } = await params;
  if (!isValidObjectId(id)) return new NextResponse("Not found", { status: 404 });
  await connectToDatabase();
  const seat = await Seat.findById(id).lean<SeatDocument>();
  const table = seat ? await Table.findById(seat.tableId).lean<TableDocument>() : null;
  if (!seat || !table) return new NextResponse("Not found", { status: 404 });

  const code = seatCode(table.name, seat.label);
  const url = guestUrl(await getBaseUrl(), seat.token);
  // ?plain=1: just the square QR, for the thumbnail on the Tables page.
  if (request.nextUrl.searchParams.get("plain") === "1") {
    const plain = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1c1917", light: "#ffffff" } });
    return new NextResponse(plain, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=300" } });
  }
  const svg = renderQrSticker({ url, code, area: table.area || undefined, restaurantName: (await getRestaurantName()) ?? "Jamavat" });
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `attachment; filename="qr-${code.replace(/\s+/g, "-")}.svg"`,
      "Cache-Control": "no-store",
    },
  });
}
