# CLAUDE_IMPLEMENTATION_PLAN.md

Status for future Claude sessions continuing this project. Read
[PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) first for the "why";
this file is the "what's done / what's left."

## v1 (parcel/token app): complete

Phases 1–6 of the original build (scaffold, menu, token orders, realtime,
admin stats, hardening) are done and were verified against a running
instance — see PROJECT_ARCHITECTURE.md §12. Vercel deployment of v1 was
never done as a separate step.

## v2: QR dine-in, Petpooja-style — in progress

Agreed with the owner on 2026-10-07. Design canvas (all screens):
https://claude.ai/artifact/Dy69AoyjoUUj5oiu3261aJ

Build for **one restaurant first**; multi-restaurant comes last. Decisions
that shape the code:

- Staff stay logged in until they log out; each staff member can change
  their own PIN.
- QR per table side (table 4 → 4A, 4B). One QR = one guest at a time,
  locked until the bill is settled; the counter can free a stuck QR. No
  bill merging across QRs.
- Guest verifies email by OTP once per sitting (settle/free resets the
  phone). OTP and the thank-you email go through Gmail SMTP.
- QR orders go straight to the kitchens (no counter approval), split
  item-wise by category (admin maps categories → staff logins). No
  "served" step: the table is freed when its bill is settled.
- Pay at the counter after the meal (cash/UPI/card). No GST, no printing —
  only a thank-you email with bill details.
- Menus → categories → items are fully dynamic; with one menu the guest
  sees no menu tabs. Only a cooking note (no "call waiter"/"ask for bill").
- Realtime moves to Pusher (private channels), keeping a slow resync.
- UI mostly English with a ગુજરાતી toggle.
- Hosting stays on Vercel (`jamavat.vercel.app`); Pro plan before selling.

| Phase | Scope | Status |
|---|---|---|
| 1 | Staff PIN login (persistent), change own PIN, roles, admin staff page, every page/API role-guarded, SW no longer caches per-user payloads; screens built to the design canvas (light theme, Jakarta + Noto Gujarati, EN/ગુ toggle, staff shell header, Install app, restaurant name + Settings) | ✅ |
| 2 | Dynamic Menu → Category → Item (additive v1 migration), menus admin page, kitchen routing matrix on Staff page, item-level kitchen status, new Kitchen screen (`/kitchen`, sold-out toggles, beep), Pusher private-channel realtime (Socket.IO removed), counter new-order grouped by menu with sold-out | ✅ |
| 3 | Tables + seat QRs (admin page, SVG download, A4 print sheet, regenerate), guest QR page `/t/{token}` (menu, cart + cooking note, email OTP via Gmail SMTP once per phone, live status, busy/invalid screens), QR lock, counter screen `/counter` (accept/reject QR orders, running orders, free QR) | ✅ |
| 4 | QR orders straight to kitchens (no accept, no "served" step); counter seat grid + seat page with settle (discount, payment mode, thank-you email, auto-free); Today + monthly reports; guest verification per sitting + reset after settle; guest Pusher channel; QR stickers; staff app headers/screens per the design; shared UI kit (CLAUDE.md) | ✅ |
| 4b | Go-live pass: dish photos on Vercel Blob (browser-resized, `DISH_PHOTOS.md`), parcel payment mode in reports, guest Pusher only during a visible sitting, vitest unit tests (`npm test`) | ✅ |
| 4c | WhatsApp inbox `/whatsapp`: Cloud API webhook (messages + statuses, idempotent), customer/conversation/message models, send API (24-hour window), private Pusher channel, unit + e2e tests | ✅ |
| 5 | Jamavat as a subscription SaaS — split into 5A–5H below | 🟡 |

## Phase 5: Jamavat as a subscription SaaS (started 2026-10-18)

The owner sells Jamavat to many restaurants **by subscription**. Payments are
recorded by hand in HQ for now; **Razorpay comes later as its own planned
step (5E)** — everything before it keeps the fields and the payment ledger
Razorpay will write to. The owner asked for the SEO website + inquiry form
first; it can only take `/` once the staff app moves to `/r/{slug}`, so 5A
(data separation) lands first and 5B right after it, in the same release.

Decisions:

- One deployment, one database, one domain. `/` = Jamavat website (public,
  indexed). `/r/{slug}/…` = one restaurant's staff app (login, counter,
  kitchen, admin; noindex). `/t/{token}` = guest QR page — kept at the old
  path because QRs are already printed and a shorter URL makes a less dense
  QR; the restaurant comes from the seat. `/hq` = super admin, only the owner.
- Every tenant document carries `restaurantId`; a Mongoose plugin refuses
  any query, update, delete or aggregate on a tenant model whose filter
  lacks it — a forgotten filter fails loudly instead of leaking another
  restaurant's data.
- Staff APIs take the restaurant from the session (`requireStaff` returns
  `restaurantId`), never from the URL or the request body. Guest APIs take
  it from the seat token. Realtime channels are per restaurant.
- The live restaurant becomes the first tenant through a one-time, locked,
  idempotent migration on first DB connect (stamps `restaurantId`, rebuilds
  the unique indexes per restaurant, carries over today's token and bill
  counters). Its staff stay logged in; old links (`/counter`, `/login`, an
  installed app opening `/`) redirect to `/r/{slug}/…`.
- New restaurants are created in HQ with a plan and a trial; the owner gets
  an invite link (emailed, and shown in HQ to share on WhatsApp) to set the
  first admin's name and PIN. `/setup` goes away.
- Website text lives in code in English and ગુજરાતી (typed, like
  `messages.ts`); HQ can override contact details, slides, FAQs and SEO
  fields. Pricing comes from the plans in HQ (only plans marked public).

| Phase | Scope | Status |
|---|---|---|
| 5A | ✅ **Data separation.** `restaurantId` on Menu, Category, MenuItem, Order, Bill, Staff, Table, Seat, GuestSession, WhatsApp*; per-restaurant unique indexes (staff name, token per day, bill no, legacy keys, wa_id); tenant guard plugin; Restaurant gets `slug`, status, subscription fields; session cookie carries restaurant id + slug; `requireStaff` → `restaurantId`; per-restaurant Pusher channels (`private-staff-{id}`, `private-whatsapp-{id}`) checked in `/api/pusher/auth`; counters `{rid}:{date}` / `{rid}:bill`; Blob paths `restaurants/{id}/…`; WhatsApp number → restaurant; locked one-time migration of the live data; staff app under `/r/[slug]` (+ per-restaurant manifest / installed app), redirects for old paths and old cookies; `/login` finds the restaurant; invite link → first admin | ✅ |
| 5B | ✅ **Website + SEO + inquiry.** Own root layout (static, no cookies, no service worker); `/` per the Landing artboard + pricing; `/gu` mirror with hreflang; keyword pages (`/restaurant-management-software`, `/qr-code-ordering-system`, `/kitchen-display-system`, `/restaurant-billing-software`), `/pricing`, `/privacy`, `/terms`; title/description/canonical/OG image; JSON-LD (Organization, WebSite, SoftwareApplication + offers, FAQPage, BreadcrumbList); `sitemap.xml`, `robots.txt` (app paths disallowed + noindex); inquiry form → `/api/inquiries` (zod, honeypot, IP rate limit, same-phone de-dupe, UTM/source kept) → `Inquiry` + email to HQ; WhatsApp chat link; content cached and revalidated when HQ saves | ✅ (HQ-edited content and the OG image are 5C/5F) |
| 5C | **HQ (`/hq`).** Email-OTP login for HQ admins (first one created with `SETUP_KEY`), own cookie; dashboard (restaurants, new inquiries, orders today across all); restaurants list + create (slug check, plan, trial, owner email → invite) + detail (status, plan, usage, invite again, suspend/resume, change slug with redirect); inquiries (New → Contacted → Converted/Lost, notes, call, create restaurant from it); Website content; SEO settings (Search Console code, titles); Plans | ⬜ |
| 5D | **Subscriptions (manual billing).** `Plan` (name, monthly/yearly price, seat + staff limits, WhatsApp feature, public on pricing); restaurant subscription (plan, TRIAL/ACTIVE/SUSPENDED/CANCELLED, period end, grace days → computed PAST_DUE/EXPIRED); `SubscriptionPayment` ledger (HQ records UPI/cash/bank → extends the period); limits enforced on adding seats/staff and re-activating them; expired/suspended = no new orders (counter + QR), settle still works, guest sees "not taking QR orders"; admin banner 7 days before expiry; plan card in Settings; HQ "expiring soon" list + reminder email | ⬜ |
| 5E | **Razorpay** — plan separately with the owner: Subscriptions API or payment links, webhook → same ledger, invoices/GST, self-serve renew in Settings, daily cron for reminders | ⬜ later |
| 5F | **Growth/SEO ops:** custom domain (`.vercel.app` ranks poorly) + `APP_URL`; Google Search Console + sitemap submit; Google Business Profile; blog/guides edited in HQ; case studies with real restaurants; Vercel Pro (Hobby is non-commercial) | ⬜ |
| 5G | **Ops & trust:** per-restaurant data export and deletion (DPDP), HQ audit log, HQ "open admin" support login (logged), backups, uptime/error alerts, terms of service | ⬜ |
| 5H | **Self-serve signup** (optional): restaurant signs up from the website, trial starts without HQ | ⬜ later |

**5A as built (2026-10-18):**

- `lib/db/tenant.ts` — `tenantField` + `tenantGuard` on every tenant model.
  A query, update, delete, count, distinct, aggregate or bulkWrite without
  `restaurantId` throws `TenantScopeError`. The only ways past it are the
  explicit `{ crossTenant: true }` option (the seat-token lookup in
  `resolveSeat`, and a pre-tenancy cookie in `getCurrentStaff`) and the
  Restaurant/Plan/EmailOtp/Counter collections, which aren't per restaurant.
- Session cookie carries `rid` + `slug`; `requireStaff(roles, { orders })`
  returns `restaurantId`/`restaurantSlug` and refuses order-taking when the
  subscription has run out (402) or HQ paused the restaurant (403).
- Screens stay restaurant-relative: `RestaurantProvider` gives `path()`
  (`"/counter"` → `/r/kiran/counter`) and the restaurant's id for its Pusher
  channels (`private-staff-{id}`, `private-whatsapp-{id}`), which
  `/api/pusher/auth` only signs for that restaurant's own staff.
- Guests keep the short `/t/{token}` link (QRs are already printed); the
  token says which restaurant it is.
- `/setup` is gone: HQ creates a restaurant and emails an invite link
  (`/r/{slug}/welcome?invite=…`, hashed + 14 days, dead once any staff
  exists, `lib/auth/invite.ts`).
- Old links keep working: the proxy sends `/`, `/counter`, `/login`… to
  `/r/{slug}/…` using the cookie's slug, and a cookie from before tenancy
  through `/go`, which reads the restaurant once and re-issues the cookie.
  Each restaurant installs its own PWA (`/r/{slug}/manifest.webmanifest`,
  `start_url` its own login), so staff never see the Jamavat website.
- Plan limits are enforced where things are created: `lib/limits.ts`
  (`seatBudget`, `staffBudget`) → 402 with a translated message.
- `lib/db/migrate.ts` runs once on first DB connect behind a lock: stamps
  `restaurantId`, gives the existing restaurant a slug + ACTIVE with no end
  date, drops the old global unique indexes and carries today's token and
  bill counters over. Covered by `tests/migrate.int.test.ts` (skipped unless
  `MONGODB_TEST_URI` names a throwaway database).

**5B as built (2026-10-18):**

- `(site)` route group with its own layout: no service worker, no staff
  session, nothing that needs JavaScript to read. `/` and `/gu` are the home
  page; `/pricing`, `/terms` and four keyword pages
  (`/restaurant-management-software`, `/qr-code-ordering-system`,
  `/kitchen-display-system`, `/restaurant-billing-software`) each exist in
  both languages at their own address, with canonical + hreflang and a
  language switch that links to the other address (never a cookie).
- Copy lives in `lib/site/content.ts` as `Localized` pairs — long-form
  marketing text HQ will edit later, kept out of the app's `messages.ts`.
  Each keyword page has its own title, description and body; `tests/
  siteUrls.test.ts` checks both languages are filled in and the titles and
  descriptions are the length a search result shows.
- JSON-LD (`lib/site/jsonLd.ts`): Organization, SoftwareApplication,
  FAQPage, BreadcrumbList — facts only, no invented ratings. `sitemap.xml`
  lists both languages per page; `robots.ts` disallows `/r/`, `/t/`, `/hq`,
  `/go` and `/api/`.
- Inquiry: `POST /api/inquiries` → `Inquiry` + an email to `HQ_EMAIL` (falls
  back to `SMTP_USER`). Guarded by a honeypot field, a per-address hourly
  limit and a same-phone de-dupe inside 24 h, so HQ's list stays readable.
  Verified end to end in the browser.
- Pricing shows only the plans HQ marked public; with none set up it says
  so and points at the demo form rather than inventing a price.
- The hero carousel keeps every slide's text in the HTML (only the display
  changes), and its frames are labelled placeholders until there are real
  screenshots — an invented screenshot would show a restaurant that doesn't
  exist.

Cases 5A–5D must cover (checklist — tick in tests or by hand):

- Two restaurants with the same staff name, table "4", category, token 1
  and bill 1 on the same day — none collide, none sees the other's.
- A staff cookie from restaurant A on `/r/B/…` → sent to A; an A session id
  with a forged B id in the cookie → rejected (signature + DB check).
- Pusher: an A staff member can't subscribe to B's channels.
- Guest QR of A can't read or order B's dishes (menu item ids from B are
  refused); seat token lookup gives the restaurant.
- Reports, today, month, bill numbers, counters, kitchen routing and
  sold-out toggles are per restaurant.
- WhatsApp webhook for an unknown number id is ignored.
- Migration: runs once even with parallel cold starts; live tokens keep
  counting today; old staff cookies keep working and get upgraded; old
  printed QRs keep working; old installed app (`/`) lands on the staff app.
- Restaurant suspended → staff see "account paused", guests "not taking
  orders"; expired → after grace no new orders but settle works.
- Plan limits: adding the 11th QR on a 10-QR plan is refused with a clear
  message; downgrading below current usage keeps existing seats but blocks
  new ones.
- Inquiry: spam bot (honeypot) silently dropped; same phone twice in a day
  updates one inquiry; >5 per IP per hour → 429; HQ gets an email.
- SEO: `/r/*`, `/t/*`, `/hq/*`, `/login` are `noindex` and disallowed in
  robots; every public page has one H1, a unique title/description,
  canonical and hreflang; sitemap lists only public pages.
- HQ: only allow-listed HQ admins; OTP purpose `hq` can't be used as a
  guest OTP and vice versa; the guest test inbox bypass never applies to HQ.

## Known non-blocking items

- Pusher needs real keys to be exercised end-to-end; without them every
  screen falls back to 5s polling (verified). Once keys exist, check two
  devices: order on the counter → beep + ticket on the kitchen screen.
- Gmail SMTP needs the owner's Gmail address + App Password in Vercel
  (`SMTP_USER`, `SMTP_PASS`). Without them production guests can't verify
  (the OTP send returns "email is down"); development shows the code on
  screen instead. Also set `APP_URL=https://jamavat.vercel.app` before
  printing QRs.
- Phase 4 notes: settle closes the GuestSession with `closedReason:
  "SETTLED"` via `closeSeatSession()` in `lib/tables.ts`, then sends the
  thank-you email with `sendMail()` from `lib/mail.ts`.
- `npm test` covers pure logic only (i18n parity, page access, report
  ranges, validation, bill email, QR sticker). API flows are still tested
  by hand-run scripts against an isolated DB; next worth automating: order
  idempotency, settle double-tap, auth lockout / sessionVersion.
- Privacy policy: public `/privacy` (data deletion at `/privacy#delete`) —
  the URLs Meta needs to publish the app; the guest Verify screen can link to it.
- Vercel Hobby is non-commercial; move to Pro before selling Jamavat.
- Free-plan headroom: Gmail sends ~500 mails/day (2,000 on Google
  Workspace) and a sitting uses at most 2 (OTP + thank-you); Pusher free
  allows 100 connections / 200k messages a day; Blob free is 1 GB storage
  and 10 GB transfer a month (`DISH_PHOTOS.md`).
