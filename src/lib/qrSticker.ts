import QRCode from "qrcode";
import { escapeHtml } from "@/lib/mail";

interface StickerInput {
  url: string;
  code: string;
  area?: string;
  restaurantName: string;
  /** Dashed cut line around the sticker (print sheet). */
  cutLine?: boolean;
}

/** Sticker size on paper. 9 fit on an A4 sheet (3 × 3) with room for margins. */
export const STICKER_MM = { width: 62, height: 88 };

/**
 * One table-side sticker as SVG, laid out in tenths of a millimetre:
 * restaurant name, the QR (44 mm — scans comfortably from a seated phone),
 * then "TABLE · ટેબલ" and the seat code big enough to read across the table.
 * Used by both the single download and the A4 print sheet.
 */
export function renderQrSticker({ url, code, area, restaurantName, cutLine = false }: StickerInput): string {
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const quiet = 2;
  const qrSide = 440;
  const unit = qrSide / (size + quiet * 2);
  let path = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.modules.get(row, col)) path += `M${col + quiet} ${row + quiet}h1v1h-1z`;
    }
  }
  const w = STICKER_MM.width * 10;
  const h = STICKER_MM.height * 10;
  const qrX = (w - qrSide) / 2;
  const qrY = 100;
  const font = "'Plus Jakarta Sans','Noto Sans Gujarati',Arial,sans-serif";
  const name = escapeHtml(restaurantName.length > 26 ? `${restaurantName.slice(0, 25)}…` : restaurantName);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${STICKER_MM.width}mm" height="${STICKER_MM.height}mm" viewBox="0 0 ${w} ${h}" font-family="${font}">
  <rect x="${cutLine ? 4 : 0}" y="${cutLine ? 4 : 0}" width="${w - (cutLine ? 8 : 0)}" height="${h - (cutLine ? 8 : 0)}" rx="${cutLine ? 0 : 36}" fill="#ffffff" stroke="${cutLine ? "#a8a29e" : "#e7e5e4"}" stroke-width="3" ${cutLine ? 'stroke-dasharray="14 10"' : ""}/>
  <text x="${w / 2}" y="68" text-anchor="middle" font-size="40" font-weight="800" fill="#1c1917">${name}</text>
  <g transform="translate(${qrX} ${qrY}) scale(${unit})"><rect width="${size + quiet * 2}" height="${size + quiet * 2}" fill="#ffffff"/><path d="${path}" fill="#1c1917" shape-rendering="crispEdges"/></g>
  <text x="${w / 2}" y="592" text-anchor="middle" font-size="26" font-weight="700" letter-spacing="4" fill="#57534e">TABLE · ટેબલ</text>
  <text x="${w / 2}" y="${area ? 690 : 700}" text-anchor="middle" font-size="${code.length > 6 ? 76 : 104}" font-weight="800" fill="#c2410c">${escapeHtml(code)}</text>
  ${area ? `<text x="${w / 2}" y="732" text-anchor="middle" font-size="26" fill="#57534e">${escapeHtml(area)}</text>` : ""}
  <text x="${w / 2}" y="782" text-anchor="middle" font-size="30" font-weight="800" fill="#1c1917">Scan to order · ઓર્ડર કરવા સ્કેન કરો</text>
  <text x="${w / 2}" y="822" text-anchor="middle" font-size="22" fill="#57534e">Pay at the counter after your meal</text>
  <text x="${w / 2}" y="856" text-anchor="middle" font-size="18" fill="#a8a29e">Powered by Jamavat</text>
</svg>`;
}
