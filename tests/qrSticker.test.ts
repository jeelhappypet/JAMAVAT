import { describe, expect, it } from "vitest";
import { STICKER_MM, renderQrSticker } from "@/lib/qrSticker";

describe("QR sticker", () => {
  const svg = renderQrSticker({ url: "https://jamavat.vercel.app/t/abc123", code: "4A", area: "Garden", restaurantName: "Guru & Sons" });

  it("prints at its real size in millimetres", () => {
    expect(svg).toContain(`width="${STICKER_MM.width}mm"`);
    expect(svg).toContain(`height="${STICKER_MM.height}mm"`);
  });

  it("labels the table under the code and escapes text", () => {
    expect(svg).toContain(">4A<");
    expect(svg).toContain("Guru &amp; Sons");
    expect(svg).not.toContain("Guru & Sons");
  });
});
