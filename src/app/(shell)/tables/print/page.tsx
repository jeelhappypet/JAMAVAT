import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, homePathFor } from "@/lib/auth/access";
import { getBaseUrl, guestUrl, loadTables } from "@/lib/tables";
import { getRestaurantName } from "@/lib/restaurant";
import { getTranslator } from "@/lib/i18n/server";
import { makeTranslator } from "@/lib/i18n/messages";
import { PrintButton } from "@/components/tables/PrintButton";

/** A4 sheet of every active QR: cut along the dashed lines, stick each on its side of the table. */
export default async function PrintQrPage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (staff.role !== "ADMIN") redirect(homePathFor(staff.role));

  const [t, tables, restaurantName, baseUrl] = await Promise.all([getTranslator(), loadTables({ activeOnly: true }), getRestaurantName(), getBaseUrl()]);
  // The sticker carries both languages regardless of the admin's screen language.
  const en = makeTranslator("en");
  const gu = makeTranslator("gu");

  const cards = await Promise.all(
    tables.flatMap((table) =>
      table.seats.map(async (seat) => ({
        id: seat.id,
        code: seat.code,
        area: table.area,
        svg: await QRCode.toString(guestUrl(baseUrl, seat.token), { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1c1917", light: "#ffffff" } }),
      }))
    )
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-extrabold tracking-tight">{t("tables.printAll")}</h1>
          <p className="text-[15px] text-text-muted">{t("print.hint")}</p>
        </div>
        <PrintButton label={t("print.print")} />
      </div>

      <div className="grid grid-cols-2 gap-0 bg-white print:m-0 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.id} className="flex break-inside-avoid flex-col items-center gap-2 border border-dashed border-stone-400 p-5 text-center text-stone-900">
            <span className="text-sm font-extrabold">{restaurantName ?? "Jamavat"}</span>
            <div className="w-full max-w-[180px] [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: card.svg }} />
            <span className="text-3xl font-extrabold leading-none tracking-tight">{card.code}</span>
            {card.area ? <span className="text-xs text-stone-600">{card.area}</span> : null}
            <span className="text-sm font-bold">
              {en("print.scan")} · {gu("print.scan")}
            </span>
            <span className="text-[11px] text-stone-600">
              {en("guest.payNote")} · {gu("guest.payNote")}
            </span>
            <span className="text-[10px] text-stone-500">Jamavat</span>
          </div>
        ))}
      </div>
    </>
  );
}
