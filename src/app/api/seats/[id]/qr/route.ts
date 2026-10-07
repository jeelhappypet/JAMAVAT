import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import QRCode from "qrcode";
import { Seat, type SeatDocument } from "@/models/Seat";
import { Table, type TableDocument } from "@/models/Table";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getBaseUrl, guestUrl, seatCode } from "@/lib/tables";
import { connectToDatabase } from "@/lib/db/mongodb";

/** The QR for one seat as a downloadable SVG (prints sharp at any size). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;

  const { id } = await params;
  if (!isValidObjectId(id)) return new NextResponse("Not found", { status: 404 });
  await connectToDatabase();
  const seat = await Seat.findById(id).lean<SeatDocument>();
  const table = seat ? await Table.findById(seat.tableId).lean<TableDocument>() : null;
  if (!seat || !table) return new NextResponse("Not found", { status: 404 });

  const svg = await QRCode.toString(guestUrl(await getBaseUrl(), seat.token), {
    type: "svg",
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#1c1917", light: "#ffffff" },
  });
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `attachment; filename="qr-${seatCode(table.name, seat.label).replace(/\s+/g, "-")}.svg"`,
      "Cache-Control": "no-store",
    },
  });
}
