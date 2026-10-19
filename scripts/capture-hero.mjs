/**
 * Captures the four hero screenshots on the Jamavat website
 * (src/lib/site/content.ts#SLIDES → public/site/hero-*.png) from the seeded
 * "Jamavat Demo" restaurant — published on purpose, exactly so the website
 * never shows a customer's real dishes or sales (PROJECT_ARCHITECTURE.md §8d).
 *
 * Needs a production server (`npm run build && PORT=3000 npm start`) — dev
 * mode bakes in the Next.js dev-tools indicator, which would show up in
 * every shot — and a freshly seeded demo (`node scripts/seed-demo.mjs`).
 *
 *   node scripts/capture-hero.mjs                  # http://localhost:3000
 *   BASE_URL=http://localhost:4000 node scripts/capture-hero.mjs
 *
 * Re-run this and commit the new PNGs whenever a screenshotted screen's
 * design changes.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = fileURLToPath(new URL("../public/site/", import.meta.url));
const outPath = (name) => `${OUT}${name}`;

async function freeSeatToken() {
  let uri;
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^MONGODB_URI=(.*)$/);
    if (m) uri = m[1];
  }
  if (!uri) throw new Error("MONGODB_URI not found in .env.local");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const restaurant = await db.collection("restaurants").findOne({ slug: "demo" });
  if (!restaurant) throw new Error('No "demo" restaurant — run scripts/seed-demo.mjs first.');
  const seat = await db.collection("seats").findOne({ restaurantId: restaurant._id, currentSessionId: null, isActive: true });
  if (!seat) throw new Error("No free seat on the demo restaurant to show the guest menu on.");
  await mongoose.disconnect();
  return seat.token;
}

async function settled(page) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if ((await page.locator('[aria-busy="true"]').count()) === 0) break;
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(500);
}

async function pinLogin(page, roleText, pin) {
  await page.goto(`${BASE}/r/demo/login`, { waitUntil: "networkidle" });
  await page.getByText(roleText, { exact: true }).first().click();
  for (const digit of pin) await page.getByRole("button", { name: digit, exact: true }).click();
  await page.waitForLoadState("networkidle");
  await settled(page);
  await page.waitForTimeout(500); // lets the post-login client redirect finish before the next goto
}

/** A real swipe (intermediate pointermove events), not a single jump — SwipeToSend tracks drag distance. */
async function swipe(page, locator) {
  const box = await locator.boundingBox();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 28, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(box.x + 28 + ((box.width - 56) * i) / 10, y);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
}

const freeToken = await freeSeatToken();
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
async function freshPage(viewport) {
  const context = await browser.newContext({ viewport });
  return { context, page: await context.newPage() };
}

// 1. Counter places a fresh table order, then screenshots the seats grid ("Serve and settle").
{
  const { context, page } = await freshPage({ width: 1180, height: 760 });
  await pinLogin(page, "Counter", "2222");
  await page.goto(`${BASE}/r/demo/counter/orders`, { waitUntil: "networkidle" });
  await settled(page);
  await page.getByRole("button", { name: "New table order" }).click();
  await page.waitForTimeout(400);
  await page.locator("a[href*='/new-order?seat=']").first().click();
  await page.waitForLoadState("networkidle");
  await settled(page);
  const dishes = page.locator("button, [role=button]").filter({ hasText: "₹" });
  await dishes.nth(0).click();
  await page.waitForTimeout(200);
  await dishes.nth(3).click();
  await page.waitForTimeout(400);
  await swipe(page, page.getByText(/Swipe to/i));
  await page.waitForTimeout(1500);

  await page.goto(`${BASE}/r/demo/counter`, { waitUntil: "networkidle" });
  await settled(page);
  await page.screenshot({ path: outPath("hero-counter.png") });
  await context.close();
}

// 2. Kitchen ticket — the order just placed is now waiting here ("Each kitchen sees only its dishes").
{
  const { context, page } = await freshPage({ width: 1180, height: 760 });
  await pinLogin(page, "Gujarati kitchen", "3333");
  await settled(page);
  await page.screenshot({ path: outPath("hero-kitchen.png") });
  await context.close();
}

// 3. Guest menu — a different, still-free seat ("Order from the table").
{
  const { context, page } = await freshPage({ width: 420, height: 860 });
  await page.goto(`${BASE}/t/${freeToken}`, { waitUntil: "networkidle" });
  await settled(page);
  await page.screenshot({ path: outPath("hero-guest-menu.png") });
  await context.close();
}

// 4. Today's report (admin) — "Admin" role text is unique, unlike the "Jamavat" brand wordmark ("Today's sales, live").
{
  const { context, page } = await freshPage({ width: 1180, height: 760 });
  await pinLogin(page, "Admin", "1111");
  await page.goto(`${BASE}/r/demo/today`, { waitUntil: "networkidle" });
  await settled(page);
  await page.screenshot({ path: outPath("hero-report.png") });
  await context.close();
}

await browser.close();
console.log(`done — public/site/hero-*.png`);
