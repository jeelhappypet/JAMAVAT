/**
 * Draws the Open Graph card (public/site/og.png, 1200×630) — the picture
 * WhatsApp, Facebook, LinkedIn and Google show when someone shares a link to
 * the Jamavat website. Built from the brand mark and the guest-menu hero
 * screenshot, so re-run it after `capture-hero.mjs` changes that one.
 *
 *   node scripts/capture-og.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const SITE = new URL("../public/site/", import.meta.url);
const phone = readFileSync(new URL("hero-guest-menu.png", SITE)).toString("base64");

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=block">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; font-family: "Plus Jakarta Sans", system-ui, sans-serif; color: #1c1917;
         background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); display: flex; align-items: center;
         padding: 0 80px; gap: 64px; overflow: hidden; }
  .copy { flex: 1; display: flex; flex-direction: column; gap: 28px; }
  .brand { display: flex; align-items: center; gap: 18px; }
  .mark { width: 76px; height: 76px; border-radius: 20px; background: #c2410c; display: flex; align-items: center; justify-content: center; }
  .name { font-size: 52px; font-weight: 800; letter-spacing: -0.02em; }
  h1 { font-size: 50px; line-height: 1.12; font-weight: 800; letter-spacing: -0.02em; }
  p { font-size: 26px; font-weight: 500; color: #57534e; }
  .phone { width: 300px; height: 560px; border-radius: 40px; background: #1c1917; padding: 12px; margin-top: 120px;
           box-shadow: 0 30px 60px rgba(124, 45, 18, 0.25); flex-shrink: 0; }
  .phone img { width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: 30px; display: block; }
</style></head>
<body>
  <div class="copy">
    <div class="brand">
      <div class="mark">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 18h18"/><path d="M5 18a7 7 0 0 1 14 0"/><path d="M12 8V6"/><path d="M10 6h4"/>
        </svg>
      </div>
      <span class="name">Jamavat</span>
    </div>
    <h1>QR table ordering &amp; kitchen software for restaurants</h1>
    <p>No app to install · Any phone or tablet · English + ગુજરાતી</p>
  </div>
  <div class="phone"><img src="data:image/png;base64,${phone}" alt=""></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: fileURLToPath(new URL("og.png", SITE)) });
await browser.close();
console.log("wrote public/site/og.png");
