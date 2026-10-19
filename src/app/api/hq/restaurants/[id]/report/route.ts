import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Restaurant, type RestaurantDocument } from "@/models/Restaurant";
import { requireHq } from "@/lib/hq/guard";
import { getRangeReport } from "@/lib/reports";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SPAN_DAYS = 366;

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function csvRow(values: (string | number)[]): string {
  return values.map(csvCell).join(",");
}

/** A restaurant's sales for any date range HQ picks, as a CSV download — no new dependency for one button. */
export async function GET(request: Request, { params }: Params) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);

    const url = new URL(request.url);
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    if (!DATE.test(from) || !DATE.test(to) || from > to) return jsonError("Pick a valid from/to date range", 400);
    const spanDays = (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000;
    if (spanDays > MAX_SPAN_DAYS) return jsonError(`Pick a range of ${MAX_SPAN_DAYS} days or less`, 400);

    await connectToDatabase();
    const restaurant = await Restaurant.findById(id).select({ name: 1 }).lean<RestaurantDocument>();
    if (!restaurant) return jsonError(t("err.notFound"), 404);

    const report = await getRangeReport(id, from, to);

    const lines: string[] = [];
    lines.push(csvRow([`${restaurant.name} — ${from} to ${to}`]));
    lines.push("");
    lines.push(csvRow(["Orders", "Dine-in", "Parcel", "Cancelled", "Bills", "Sales (₹)", "Average bill (₹)"]));
    lines.push(csvRow([report.orders, report.dineIn, report.parcel, report.cancelled, report.bills, report.sales, report.averageBill]));
    lines.push("");
    lines.push(csvRow(["Date", "Orders", "Dine-in", "Parcel", "Cancelled", "Sales (₹)"]));
    for (const day of [...report.days].reverse()) lines.push(csvRow([day.date, day.orders, day.dineIn, day.parcel, day.cancelled, day.sales]));
    lines.push("");
    lines.push(csvRow(["Payment mode", "Amount (₹)"]));
    for (const row of report.byPayment) lines.push(csvRow([row.mode, row.amount]));
    lines.push("");
    lines.push(csvRow(["Top dishes", "Quantity", "Amount (₹)"]));
    for (const dish of report.topDishes) lines.push(csvRow([dish.name, dish.quantity, dish.amount]));

    const csv = `﻿${lines.join("\n")}\n`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${restaurant.name.replace(/[^a-z0-9]+/gi, "-")}-${from}-to-${to}.csv"`,
      },
    });
  });
}
