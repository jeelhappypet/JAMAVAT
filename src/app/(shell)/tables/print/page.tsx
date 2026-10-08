import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, homePathFor } from "@/lib/auth/access";
import { getBaseUrl, guestUrl, loadTables } from "@/lib/tables";
import { getRestaurantName } from "@/lib/restaurant";
import { getTranslator } from "@/lib/i18n/server";
import { renderQrSticker } from "@/lib/qrSticker";
import { PrintButton } from "@/components/tables/PrintButton";

/** A4 sheet of every active QR, 9 per page at true size: cut on the dashed lines, stick each on its side of the table. */
export default async function PrintQrPage() {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (staff.role !== "ADMIN") redirect(homePathFor(staff.role));

  const [t, tables, restaurantName, baseUrl] = await Promise.all([getTranslator(), loadTables({ activeOnly: true }), getRestaurantName(), getBaseUrl()]);
  const stickers = tables.flatMap((table) =>
    table.seats.map((seat) => ({
      id: seat.id,
      svg: renderQrSticker({ url: guestUrl(baseUrl, seat.token), code: seat.code, area: table.area, restaurantName: restaurantName ?? "Jamavat", cutLine: true }),
    }))
  );

  return (
    <>
      <style>{"@page { size: A4; margin: 8mm; }"}</style>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-extrabold tracking-tight">{t("tables.printAll")}</h1>
          <p className="text-[15px] text-text-muted">{t("print.hint")}</p>
        </div>
        <PrintButton label={t("print.print")} />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,62mm)] justify-center gap-[3mm] bg-white p-[3mm] print:grid-cols-[repeat(3,62mm)] print:p-0">
        {stickers.map((sticker) => (
          <div key={sticker.id} className="break-inside-avoid" dangerouslySetInnerHTML={{ __html: sticker.svg }} />
        ))}
      </div>
    </>
  );
}
