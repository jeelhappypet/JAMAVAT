/**
 * Sweeps every screen at phone / tablet / laptop width and reports anything
 * that breaks: a page wider than the window, a control outside it, a tap
 * target too small for a thumb, or a console error.
 *
 *   npm run build && npx next start -p 3100
 *   node scripts/audit-screens.mjs
 *
 * It signs its own staff and HQ cookies from `.env.local`, because most of
 * these screens are behind a PIN, and picks a free QR out of the dev database
 * for the guest screens, which are behind no login at all. It only reads —
 * nothing it opens writes to a sitting.
 *
 * Three things it reports are expected and not bugs:
 *   - an INPUT at left:-9999px — the inquiry form's honeypot;
 *   - `/privacy`'s mailto link — an inline link in a sentence, which the
 *     target-size rule exempts;
 *   - `/today`'s 23x180 chart columns — bar-chart bars, narrow by nature of
 *     the data and 180px tall.
 * Anything else is worth looking at.
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import { chromium } from "playwright";

const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n").filter((l)=>l.includes("=")&&!l.trim().startsWith("#")).map((l)=>[l.slice(0,l.indexOf("=")).trim(), l.slice(l.indexOf("=")+1).trim()]));
await mongoose.connect(env.MONGODB_URI);
const db = mongoose.connection.db;
const r = await db.collection("restaurants").findOne({ slug: "gurukrupa" });
const st = await db.collection("staffs").findOne({ restaurantId: r._id, role: "ADMIN", isActive: true });
// A guest QR to sweep the screens behind no login at all. A free seat, so the
// sweep never shows (or touches) a sitting someone is actually having.
const seat = await db.collection("seats").findOne({ restaurantId: r._id, isActive: true, currentSessionId: { $in: [null, undefined] } }, { projection: { token: 1 } });
await mongoose.disconnect();
const sign = (payload, prefix = "") => { const p = Buffer.from(JSON.stringify(payload)).toString("base64url"); return `${p}.${createHmac("sha256", prefix + env.ADMIN_SESSION_SECRET).update(p).digest("hex")}`; };
const staffToken = sign({ sid: String(st._id), sv: st.sessionVersion ?? 0, role: st.role, rid: String(r._id), slug: r.slug, iat: Date.now() });
const hqToken = sign({ email: (env.HQ_EMAILS || "").split(",")[0].trim().toLowerCase(), iat: Date.now() }, "hq:");

const PAGES = [
  ["site", "/"], ["site", "/pricing"], ["site", "/qr-code-ordering-system"], ["site", "/gu"], ["site", "/terms"], ["site", "/privacy"], ["site", "/login"],
  ["staff", "/r/gurukrupa/counter"], ["staff", "/r/gurukrupa/counter/orders"], ["staff", "/r/gurukrupa/new-order"], ["staff", "/r/gurukrupa/counter/menu"],
  ["staff", "/r/gurukrupa/today"], ["staff", "/r/gurukrupa/menu"], ["staff", "/r/gurukrupa/tables"], ["staff", "/r/gurukrupa/staff"],
  ["staff", "/r/gurukrupa/reports"], ["staff", "/r/gurukrupa/settings"], ["staff", "/r/gurukrupa/kitchen"], ["staff", "/r/gurukrupa/login"],
  ["hq", "/hq"], ["hq", "/hq/inquiries"], ["hq", "/hq/plans"], ["hq", "/hq/website"],
  // The guest's own screens. `?v=` is the step, so each one can be opened
  // cold: the cart and the order list are empty on a fresh phone, which is
  // the state they have to look right in too.
  ...(seat ? [["guest", `/t/${seat.token}`], ["guest", `/t/${seat.token}?v=cart`], ["guest", `/t/${seat.token}?v=verify`], ["guest", `/t/${seat.token}?v=status`]] : []),
];
if (!seat) console.log("No free QR in the dev database — the guest screens were skipped.");

const browser = await chromium.launch();
const findings = [];
for (const width of [390, 834, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  await ctx.addCookies([
    { name: "jamavat_staff_session", value: staffToken, domain: "localhost", path: "/" },
    { name: "jamavat_hq_session", value: hqToken, domain: "localhost", path: "/" },
  ]);
  const page = await ctx.newPage();
  for (const [kind, url] of PAGES) {
    const errs = [];
    const onErr = (e) => errs.push(String(e).slice(0, 110));
    page.on("pageerror", onErr);
    page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 110)));
    try { await page.goto("http://localhost:3100" + url, { waitUntil: "networkidle", timeout: 20000 }); } catch { findings.push({ width, url, what: "TIMEOUT" }); continue; }
    await page.waitForTimeout(900);
    const res = await page.evaluate(() => {
      const doc = document.documentElement;
      const over = [];
      const small = [];
      for (const el of document.querySelectorAll("a[href], button, input, select, summary, [role='button']")) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) continue;
        if (b.right > innerWidth + 1 || b.left < -1) over.push(`${el.tagName}:${(el.textContent||el.getAttribute("aria-label")||"").trim().slice(0,22)} L${Math.round(b.left)} R${Math.round(b.right)}`);
        if ((b.height < 36 || b.width < 36) && el.tagName !== "INPUT" && el.tagName !== "SELECT") small.push(`${el.tagName}:${(el.textContent||el.getAttribute("aria-label")||"").trim().slice(0,22)} ${Math.round(b.width)}x${Math.round(b.height)}`);
      }
      return { scrollW: doc.scrollWidth, innerW: innerWidth, over: over.slice(0, 4), small: [...new Set(small)].slice(0, 4) };
    });
    page.off("pageerror", onErr);
    if (res.scrollW > res.innerW + 1) findings.push({ width, url, what: `PAGE OVERFLOW ${res.scrollW}>${res.innerW}` });
    if (res.over.length) findings.push({ width, url, what: "CONTROL OUTSIDE: " + res.over.join(" | ") });
    if (res.small.length) findings.push({ width, url, what: "SMALL TAP: " + res.small.join(" | ") });
    const real = errs.filter((e) => !/favicon|manifest|sw\.js|Download the React/i.test(e));
    if (real.length) findings.push({ width, url, what: "ERROR: " + real[0] });
  }
  await ctx.close();
}
await browser.close();
if (!findings.length) console.log("No findings.");
for (const f of findings) console.log(`[${f.width}] ${f.url}\n      ${f.what}`);
