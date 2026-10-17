# જમાવટ / Jamavat — Project Architecture

**Jamavat is the software, not a restaurant.** One deployment serves three
different things:

- `/` — Jamavat's own website (English and ગુજરાતી), the pages Google
  indexes and the "Book a free demo" form (§16).
- `/r/{slug}/…` — one restaurant's staff app, and `/t/{token}` its guests'
  QR pages. Private, never indexed (§15).
- `/hq` — the owner's panel: customers, subscriptions, plans and the leads
  from the website (§17).

What a restaurant gets is the order management PWA below: counter
(parcel/token) orders plus QR dine-in — guests scan the QR on their side of
the table, order from their phone and pay at the counter after the meal. English + ગુજરાતી (EN/ગુ
toggle; screens not yet redesigned still carry hardcoded Gujarati), staff
PIN login, single Next.js project for frontend + backend, MongoDB Atlas
persistence, Pusher realtime, Gmail SMTP for guest email.

## 1. Overview

- Parcel: counter creates it in **New parcel** → kitchens see their part on
  `/kitchen` → each marks its items done → the order completes (paid at
  order). Owner reviews `/today` and `/reports`.
- QR dine-in (§8b, §8c): guest scans `/t/{token}` → menu → cart + cooking
  note → email OTP (once per sitting) → straight to the kitchens → "served
  in a few minutes" on the phone. The table stays taken (one guest per QR)
  until the counter settles the bill on the seat page, which frees the QR
  and emails the thank-you bill.
- Staff log in once per device with their name + a 4-digit PIN and stay
  logged in until they log out (see §8). Home (`/`) shows only the tiles the
  staff member's role may open: Counter → નવો ઓર્ડર/ચાલુ ઓર્ડર, Kitchen →
  બાકી ઓર્ડર (and lands there directly after login), Admin → everything plus
  Staff and Reports.
- MongoDB is always the source of truth. Realtime is a notification layer —
  every screen also polls and resyncs, so correctness never depends on a
  socket being connected.

## 2. Technology Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS v4 (CSS-based theme in `src/app/globals.css`)
- MongoDB Atlas + Mongoose
- Pusher Channels (`pusher` server SDK, `pusher-js` client) for realtime
- Zod for server-side request validation
- `next/font/google` — Noto Sans Gujarati
- Custom minimal service worker (no PWA library) + `app/manifest.ts`

No ORM/auth/state-management libraries were added beyond the above — see
§13 for why.

## 3. Folder Structure

```
src/
├── app/
│   ├── (shell)/                  new-design staff screens sharing StaffHeader:
│   │                              page.tsx (home cards), staff/, settings/, menu/,
│   │                              counter/ (seats, orders, menu), today/, reports/, tables/ (+ print/)
│   ├── (focus)/counter/seat/[id]/ seat page — settle bill (own header, no tabs)
│   ├── t/[token]/                 guest QR page (public, noindex)
│   ├── kitchen/                   kitchen screen
│   ├── login/ setup/             PIN login, first-run setup (restaurant + admin)
│   ├── manifest.ts                PWA manifest (served at /manifest.webmanifest)
│   ├── new-order/page.tsx
│   ├── developer/page.tsx         (/pending-order → /kitchen, /live-order → /counter redirects)
│   └── api/
│       ├── auth/{login,logout,setup,change-pin,expire}/route.ts
│       ├── restaurant/route.ts                PATCH restaurant name (admin)
│       ├── staff/route.ts, staff/[id]/route.ts  admin staff management
│       ├── menu/route.ts                      GET/POST/PATCH
│       ├── orders/route.ts                    POST (create)
│       ├── orders/live/route.ts                GET
│       ├── orders/pending/route.ts             GET
│       ├── orders/[id]/cancel/route.ts         PATCH
│       ├── seats/[id]/settle, reports/{today,month}
│       ├── guest/{state,menu,orders,forget,otp/send,otp/verify}  public guest APIs
│       ├── tables/…, seats/[id]/{free,qr}       tables + seat QRs
│       └── developer/stats/route.ts
├── proxy.ts                       optimistic page guard (cookie signature only)
├── components/
│   ├── ui/            AppLogo, Button, Card, ConfirmDialog, SuccessDialog,
│   │                  HomeButton, LoadingState, EmptyState
│   ├── home/          HomeActionCard
│   ├── menu/          MenuItemCard, CategorySection
│   ├── orders/        OrderItemRow, OrderSummary, SwipeToSend, OrderCard,
│   │                  KitchenTicket
│   ├── developer/     AdminStatCard
│   ├── realtime/      RealtimeStatus, OfflineIndicator
│   └── pwa/           ServiceWorkerRegister
├── lib/
│   ├── db/mongodb.ts              cached connection
│   ├── auth/                      session.ts (signed cookie), staff.ts (DB check,
│   │                              requireStaff), access.ts (role → pages), pin.ts
│   ├── realtime/                  events.ts, server.ts (Pusher trigger), useRealtime.ts (pusher-js)
│   ├── orders/                    serialize.ts, queries.ts, kitchen.ts (routing), build.ts
│   │                              (shared item validation + token), useActiveOrders.ts
│   ├── guest/                     session.ts (guest cookie), otp.ts, state.ts
│   ├── tables.ts                  seat codes, QR URLs, seat lock helpers
│   ├── mail.ts                    nodemailer (Gmail SMTP)
│   ├── menu/structure.ts          menu tree loader + v1 → v2 migration
│   ├── validation/                zod schemas (menu/order/developer)
│   └── utils/businessDate.ts      Asia/Kolkata business-date helper
├── models/           Menu, Category, MenuItem, Order, Counter, Staff, Restaurant,
│                     Table, Seat, GuestSession, EmailOtp
└── types/index.ts    shared DTOs + category/status enums
```

`features/` from the originally suggested structure was folded into
`components/<domain>` + `lib/<domain>` — a separate layer would just
re-export the same hooks/components without adding a real boundary.

## 4. Database Schema

**Menu** → **Category** → **MenuItem** (v2, fully dynamic). A Menu is e.g.
"Gujarati" or "Punjabi" (`name`, optional `nameGu`, `sortOrder`, `isActive`);
a Category belongs to a menu and is the unit of kitchen routing; a MenuItem
has `categoryId`, `name`, `nameGu?`, `description?`/`descriptionGu?`,
`isBestseller`, `imageUrl?` (public Vercel Blob photo, see §8d), `price`,
`isVeg`, `isActive` (hidden by the admin) and `isAvailable` (sold out —
kitchens can flip it).

v1 items carried a hardcoded `category` string (શાક / રોટલી / મીઠાઈ / અન્ય).
`lib/menu/structure.ts#ensureMenuStructure` migrates them on first use —
one Category per v1 string under a default menu, matched by `legacyKey` so
concurrent first requests can't duplicate. It is **additive only** (the old
`category` field stays), so v1 code reading the same database keeps working
until it's replaced. The live database is `JAMAVATDATA`; development uses
`jamavat_dev` on the same Atlas cluster.

**Order** — `tokenNumber`, `businessDate` (YYYY-MM-DD, Asia/Kolkata),
`customerName?`, `items[]` (menuItemId + **snapshot** of name/category/price
at order time, `categoryId` for routing, quantity, lineTotal, and a
per-item `status` PENDING/READY), `totalAmount`, `status`
(`PENDING`/`READY`/`COMPLETED`/`CANCELLED`), `source`
(`COUNTER`/`QR`), `clientRequestId` (idempotency key),
`createdAt`/`readyAt`/`completedAt`/`cancelledAt`.
QR orders also carry `seatId`, `seatCode` ("4A"), `guestSessionId`,
`guestEmail` and an optional `note` (≤ 200 chars, the cooking note). Parcels
carry `paymentMode` (`CASH`/`UPI`/`CARD`, paid when ordering; missing on v1
orders); dine-in payment is on the Bill. Indexes:
`{businessDate, status}`, unique `{businessDate, tokenNumber}`,
`{createdAt}`, unique-sparse `{clientRequestId}`.

Snapshots mean a menu price change today never rewrites yesterday's orders.

**Staff** — `name` (unique, case-insensitive), `role` (`ADMIN`/`COUNTER`/
`KITCHEN`), `pinHash` + `pinSalt` (scrypt, per-staff salt), `isActive`,
`sessionVersion`, `failedPinAttempts`, `lockedUntil`, `categoryIds` (kitchen
routing — which categories' items this login's kitchen screen receives).

**Restaurant** — one per customer: `name`, `slug` (its `/r/{slug}` link),
`previousSlugs` (so a renamed link keeps redirecting), `status`, `planId`,
`billingCycle`, `paidUntil`, `graceDays`, the owner's details, the hashed
one-time `invite`, and `whatsappPhoneNumberId`. Everything else points at it
with `restaurantId` (§15). **Plan** — what a subscription costs and allows.
**SubscriptionPayment** — money received, and the period it bought.
**Inquiry** — a demo request from the website (§16).

**Table** — `name` ("4", "Garden"), `area?`, `sortOrder`, `isActive`.
**Seat** — one per table side: `tableId`, `label` (A–F), `token` (the
random string printed in the QR; regenerating it kills old prints),
`isActive`, `currentSessionId` (**the QR lock** — null when free).
Unique `{tableId, label}` and `{token}`. Seat code = table name + label
("4A"; "Garden A" when the name isn't a number).

**GuestSession** — one guest's visit on one seat: `seatId`, `seatCode`,
`email`, `deviceId`, `status` OPEN/CLOSED, `closedReason`
(FREED by the counter / SETTLED in Phase 4). Orders point at it.

**EmailOtp** — `email`, `codeHash` (HMAC, never the code), `attempts`,
`expiresAt` with a TTL index so Mongo deletes old codes.

**Counter** — `_id` = businessDate, `seq`. One doc per business day;
`findOneAndUpdate({_id: businessDate}, {$inc:{seq:1}}, {upsert:true})` is
the atomic token generator (see §6).

## 5. API Routes

Staff routes check the session with `requireStaff(roles)` (401 = not
logged in / session revoked, 403 = wrong role). Role groups live in
`lib/auth/access.ts` (`ROLES.admin`, `.counter` = admin+counter,
`.kitchen` = admin+kitchen, `.anyStaff`). The `/api/guest/*` routes are
public but only act on a valid seat token, and placing an order needs the
signed guest cookie (§8b).

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | public | name + PIN → session cookie; 5 wrong PINs lock the account 5 min |
| POST | `/api/auth/logout` | public | clears the cookie |
| POST | `/api/auth/setup` | public, once | first admin; needs `SETUP_KEY`, refuses once any staff exists |
| POST | `/api/auth/change-pin` | any staff | own PIN; signs out the person's other devices |
| GET | `/api/auth/expire` | public | deletes a stale session cookie, redirects to `/login?expired=1` |
| PATCH | `/api/restaurant` | admin | restaurant name |
| GET/POST | `/api/staff` | admin | list / add staff |
| PATCH | `/api/staff/[id]` | admin | rename, role, (de)activate, reset PIN, log out everywhere |
| GET | `/api/menu` | any staff | menus → categories → items (`?activeOnly=1` for ordering screens) |
| POST, PATCH/DELETE `[id]` | `/api/menu/menus` | admin | menus (delete only when empty) |
| POST, PATCH/DELETE `[id]` | `/api/menu/categories` | admin | categories (delete only when empty; pulled from kitchen routing) |
| POST, PATCH/DELETE `[id]` | `/api/menu/items` | admin; kitchen may PATCH only `isAvailable` for its own categories | dishes |
| POST/DELETE | `/api/menu/items/[id]/photo` | admin | upload (multipart `photo`, ≤ 1 MB, already resized by the browser) / remove the dish photo |
| POST | `/api/menu/reorder` | admin | display order of menus or categories |
| GET/POST | `/api/whatsapp/webhook` | Meta (verify token / optional signature) | webhook verification; incoming messages + delivery statuses |
| GET | `/api/whatsapp/conversations` | admin, counter | WhatsApp chats, newest first (`?q=` name/number) |
| GET | `/api/whatsapp/conversations/[id]/messages` | admin, counter | one chat, 50 messages a page (`?before=`) |
| POST | `/api/whatsapp/conversations/[id]/read` | admin, counter | unread → 0 |
| POST | `/api/whatsapp/messages/send` | admin, counter | text reply through the Cloud API (24-hour window) |
| POST | `/api/pusher/auth` | any staff | signs the private realtime channel subscription |
| POST | `/api/orders` | counter | create order, idempotent on `clientRequestId` |
| GET | `/api/orders/next-token` | counter | next token preview |
| GET | `/api/orders/live` | counter | cooking orders + those finished in the last 30 min |
| GET | `/api/orders/pending` | kitchen | the caller's tickets: only items in its categories still PENDING, plus how many are left on other screens |
| PATCH | `/api/orders/[id]/ready` | kitchen | marks the caller's items READY; the order turns READY when no item anywhere is PENDING |
| PATCH | `/api/orders/[id]/cancel` | counter | atomic `(PENDING\|READY) → CANCELLED` |
| GET | `/api/seats/[id]` | counter | seat page: the sitting's orders + kitchen names |
| POST | `/api/seats/[id]/settle` | counter | bill (discount, payment mode), complete orders, free QR, thank-you email |
| GET | `/api/reports/today?range=` / `/api/reports/month?month=` | admin | Today page / monthly report |
| GET/POST | `/api/tables` | GET counter, POST admin | tables with seats + who holds each QR / create table with N seats |
| PATCH/DELETE | `/api/tables/[id]` | admin | rename, area, hide / delete (refused while a QR is in use) |
| POST | `/api/tables/[id]/seats` | admin | add the next side (C, D…) |
| PATCH/DELETE | `/api/seats/[id]` | admin | hide / regenerate QR token / remove (not while in use, not the last seat) |
| GET | `/api/seats/[id]/qr` | admin | QR as a downloadable SVG |
| POST | `/api/seats/[id]/free` | counter | unlock a QR (closes the guest session) |
| GET | `/api/guest/state?token=` | public | seat, lock (`free`/`mine`/`taken`), the guest's orders |
| GET | `/api/guest/menu?token=` | public | active menu tree |
| POST | `/api/guest/otp/send`, `/otp/verify` | public | email OTP (rate-limited) → guest cookie |
| POST | `/api/guest/forget` | public | "not you?" — drops the verified email |
| POST | `/api/guest/orders` | verified guest | place a QR order (straight to the kitchens), takes the QR lock atomically |

There's no `DELETE /api/menu/:id` — `isActive` soft-delete was chosen
instead because orders reference `menuItemId`, and hiding an item from new
orders shouldn't touch history.

## 6. Order Lifecycle, Settle & Token Generation

`PENDING → READY → COMPLETED`, or `(PENDING|READY) → CANCELLED`, server
controlled only. There is **no counter approval and no "served" step**
(the owner's call, 2026-10-07):

- Every order — counter parcel, guest QR, counter "Add item" for a seat —
  is created `PENDING` and shows on the kitchen screens at once.
- Each kitchen marks **its** items done; whoever marks the last pending
  item finishes the order atomically. A **parcel** becomes `COMPLETED`
  right away (paid when ordering); a **table's** order becomes `READY` and
  stays on that seat's bill. Done orders leave the kitchen screens.
- The counter's Orders tab shows what's cooking plus what finished in the
  last 30 minutes (to call a token / carry food out) — read-only except
  Cancel.
- A table closes only when the counter **settles** it (§8c). Cancelling a
  guest's last open order frees the QR (nothing left to pay).

Every transition is a `findOneAndUpdate` filtered by the statuses it may
start from; a lost race matches nothing and returns `409`. Token numbers
come from the per-business-date `Counter` doc; bill numbers from the
`Counter` doc `_id: "bill"` (they never reset). `POST /api/orders` and
`POST /api/guest/orders` de-dupe on `clientRequestId`.

## 7. Realtime

Pusher Channels, one **private** channel (`private-staff`; becomes one per
restaurant in the multi-restaurant phase). Private means pusher-js must get
a signature from `/api/pusher/auth`, which requires a staff session — guests
and logged-out browsers can't listen to order events.

Events: `order:created`, `order:items-ready` (one kitchen
finished its part), `order:ready` (whole order), `order:completed`,
`order:cancelled`, `seat:updated`, `menu:updated`, `staff:routing-updated`,
`admin:stats-updated`.

Guests are not on the private channel. Each QR has a public channel
`seat-{token}` (the token is the secret printed in the QR); the server sends
an empty `guest:update` there when the counter changes that table (cancel,
add item, settle, free) and the phone refetches its own state. A phone
connects only while it has an open sitting **and** the page is on screen
(the Pusher free plan allows 100 connections; a browsing or locked phone
holds none), with a 2-min safety resync. Without Pusher the guest page polls
every 10 s during a sitting; a QR someone else holds is checked every 30 s;
the menu refreshes every 2 min.

- `emitRealtimeEvent()` is **awaited** after the DB write: on Vercel a
  function can be frozen right after it responds, so a fire-and-forget
  HTTP call to Pusher might never leave. It never throws.
- MongoDB stays the source of truth. With Pusher connected, screens still
  do a quiet 60s resync (and a full resync on every (re)subscribe); without
  Pusher keys (`NEXT_PUBLIC_PUSHER_KEY`/`_CLUSTER` unset) they poll every 5s.
  Both paths are correct — Pusher only makes them instant.
- Socket.IO and the `pages/api/socket.ts` server were removed (they never
  connected on Vercel and broadcast to anyone).

## 7a. Kitchen routing

The admin ticks categories per kitchen login (Staff page matrix). An order
item goes to every kitchen screen whose login owns its category; admins see
everything; v1 items without a category show on every screen. Each kitchen
marks only its own items ready (`items.N.status`, conditioned on still being
PENDING so double taps can't both win); whoever readies the last pending
item flips the order to READY in one conditional update. Kitchen screens can
mark their own dishes sold out; ordering a sold-out dish is refused (409).

## 8. Staff Authentication

Staff pick their name on `/login` and type a 4-digit PIN. **A device stays
logged in until that person taps Log out** — this is a product requirement,
not a default to tighten later.

- Cookie `jamavat_staff_session` = `base64url(JSON {sid, sv, role, iat}) +
  "." + HMAC-SHA256(ADMIN_SESSION_SECRET)`; HttpOnly, SameSite=Lax, `Secure`
  in production, Max-Age 400 days (the browser cap). The token itself has no
  expiry; `proxy.ts` re-issues it with a fresh `iat` once it's a week old, so
  an active device never ages out.
- `proxy.ts` only checks the signature (no DB) and redirects: no cookie →
  `/login?next=…`; wrong role for the page → that role's home
  (`homePathFor`). API routes are excluded from the proxy and always call
  `requireStaff()`, which also loads the Staff doc and rejects it if
  inactive or if `sessionVersion` no longer matches the cookie's `sv`.
- Bumping `Staff.sessionVersion` is how sessions are revoked: PIN change
  (other devices only — the current device gets a new cookie), admin PIN
  reset, role change, deactivation, "Log out devices". A revoked device's
  next server page render or API 401 sends it to `/api/auth/expire`, which
  deletes the cookie **server-side** and redirects to `/login?expired=1`.
  Don't move that clearing back into the login page: while a signed-but-
  stale cookie exists the proxy treats the device as logged in, and with
  zero staff that produced a `/` ⇄ `/login` ⇄ `/setup` redirect loop.
- PINs are scrypt-hashed with a per-staff salt. 5 wrong PINs in a row lock
  the account for 5 minutes; an admin PIN reset clears the lock.
- At least one active admin must always exist (role change/deactivation of
  the last one returns 409).
- First run: with zero staff, `/login` redirects to `/setup`, which needs
  `SETUP_KEY` (falls back to the old `ADMIN_PASSWORD`) to create the first
  admin. `/setup` refuses once any staff exists. The old env-based
  `/developer` login is gone — Reports is an admin-only page now.

## 8b. Guest QR flow

- **QR = seat token.** `/t/{token}` resolves the Seat; an unknown or
  regenerated token shows "This QR isn't active". `noindex`, outside the
  staff proxy, tab title = restaurant.
- **Guest cookie** `jamavat_guest` = HMAC-signed `{did, email?, vt?}`
  (12 h). `did` identifies the phone (the QR lock belongs to it); `email`
  + `vt` (verified-at) come from the OTP.
- **Verification lasts one sitting** (`lib/guest/verified.ts`): valid while
  the phone holds an open sitting, or within 6 h of the OTP if no sitting
  of that phone was closed since. Once the table is settled or freed the
  next order needs a fresh OTP, the state API strips the email from the
  cookie, and the page clears the cart and note — the next person on that
  QR (or phone) sees nothing of the last guest. The "thank you" screen
  after settling shows for 15 min and carries no email or amount.
- **Email OTP**: 6 digits, HMAC-hashed, 10 min, 5 tries, 30 s between
  sends, 5 sends/hour per email; Gmail SMTP via `lib/mail.ts`.
- **QR lock**: the first order takes `Seat.currentSessionId` with one
  conditional update; a second phone gets `409 SEAT_TAKEN` and the "already
  in use" screen (which names the table's other sides, e.g. 4B).
- **After ordering** the guest sees "served at your table in a few minutes"
  (no step-by-step status), their orders and the running total.
- **Live updates**: the page listens on the public Pusher channel
  `seat-{token}` and refetches on `guest:update` (sent by cancel, add item,
  settle and free — no data in the message). Polling (10–30 s) only when
  Pusher isn't connected.
- **Menu screen**: header, search, menu tabs and category chips are fixed;
  only the dish list scrolls (scroll-spy highlights the current chip).

- **Counter table order** (Orders tab → "New table order", or a free seat
  tile): `/new-order?seat=` on a free QR opens a sitting from the counter
  (`GuestSession.openedBy: "COUNTER"`, no email, `deviceId: counter:<staffId>`)
  with the same conditional lock update a guest's first order uses — so a
  guest who scans that QR gets the "already in use" screen until the bill is
  settled or freed. If a guest's phone wins the race, the counter's dishes
  join that guest's sitting. Dishes are checked before the lock is taken, so
  a sold-out dish never leaves a free table locked.
- **Test inbox**: `zeelpansuriya8@gmail.com` (the owner's) gets no OTP mail
  and no send limits; its code is always `000000` (`lib/guest/otp.ts`).

## 8c. Settle, bills and reports

- Counter → seat tile → **seat page** (`/counter/seat/{id}`, Settle
  artboard): every order of the sitting with its kitchen, "Add item"
  (opens New parcel in seat mode), discount, payment mode (Cash/UPI/Card),
  thank-you email toggle, **Settle & free table**, or "Free QR" without a
  bill.
- `POST /api/seats/{id}/settle` closes the sitting atomically (a double tap
  bills once), writes a `Bill` (lines merged per dish, items total,
  discount, total, payment mode), marks the orders `COMPLETED`, frees the
  QR, sends the thank-you email (`lib/billEmail.ts`, Email artboard; a mail
  failure never undoes the payment) and nudges the guest phone.
- **Reports** (`lib/reports.ts`): sales = settled bills (after discount) +
  parcel orders. Payment mode adds bills and parcels together per mode
  (v1 parcels without a mode show as "Parcel (mode not noted)"). `/today` (Today / Yesterday / Last 7 days / This month,
  vs the previous equal period, orders by hour, sales by menu, payment
  mode, top dishes, last 7 days) and `/reports` (month, day by day). One
  query for the whole date span with a field projection; screens reload at
  most every 5–10 s on realtime nudges.
- **QR stickers** (`lib/qrSticker.ts`): 62 × 88 mm SVG with a 44 mm QR,
  restaurant name, "TABLE · ટેબલ" and the seat code — the per-seat download
  and the A4 print sheet (9 per page) use the same sticker.

## 8d. Dish photos

- Admin → Menu → dish dialog → **Add photo**. `lib/utils/dishPhoto.ts`
  crops the picked photo to the guest menu's 6:5 box and encodes 480×400
  WebP (JPEG on browsers that can't encode WebP), ~30–60 KB, in the
  browser — the function never processes images.
- `lib/menu/photo.ts` stores it in a **public** Vercel Blob store under a
  random-suffixed URL with a one-year cache, then deletes the old one;
  deleting a dish deletes its photo. Without `BLOB_READ_WRITE_TOKEN` the
  dialog says photos aren't connected and nothing else changes.
- `components/menu/DishPhoto.tsx` renders it (`next/image` with
  `unoptimized`, lazy) — use it wherever a dish photo appears.
- Prompts for generating photos and the free-plan math: `DISH_PHOTOS.md`.

## 8e. WhatsApp inbox

Separate from the QR guest flow — nothing in ordering, tables or bills
depends on it.

- **Page** `/whatsapp` (admin + counter, `ROLES.whatsapp`), full screen with
  its own header; not linked from the staff tab bars. Chat list + search on
  the left, the chat on the right (one at a time on a phone), built from the
  UI kit (`components/whatsapp/`).
- **Webhook** `/api/whatsapp/webhook`: GET echoes `hub.challenge` when
  `hub.verify_token` matches `WHATSAPP_VERIFY_TOKEN` (403 otherwise, also
  when the env var is missing). POST verifies `X-Hub-Signature-256` when
  `WHATSAPP_APP_SECRET` is set, parses with `lib/whatsapp/webhook.ts`
  (pure, unit-tested), ignores other `phone_number_id`s (Meta's dashboard
  samples), saves everything, then answers 200; only a DB error answers 500
  so Meta retries.
- **Data** (`models/WhatsApp*.ts`, `lib/whatsapp/store.ts`): customer by
  unique `whatsappWaId` → one **open** conversation per customer and number
  (partial unique index) → message unique on `whatsappMessageId` (the
  idempotency key; a retry stops there, so unread isn't counted twice).
  The conversation keeps `customerName`/`customerWaId` copies for the list
  and search, `lastMessage`/`lastMessageAt` (never moved back by a late
  webhook), `lastInboundAt` (24-hour window) and `unreadCount`.
- **Sending** (`lib/whatsapp/graph.ts`): server-only call to
  `graph.facebook.com/{WHATSAPP_GRAPH_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages`
  with the bearer token, 15 s timeout. Refused up front outside the 24-hour
  window (templates aren't built); Meta errors become categories (window,
  recipient, auth, rate, timeout) with translated messages — the raw error
  and the token never reach the browser or the logs. Saved only after Meta
  returns a `wamid`.
- **Statuses**: sent → delivered → read only move forward; failed keeps
  Meta's code/title/details. A status that beats the send route's save is
  retried once after 1.5 s.
- **Realtime**: private Pusher channel `private-whatsapp`, authorised only
  for `ROLES.whatsapp` (kitchens never get chats). Events
  `whatsapp:message:new`, `whatsapp:message:sent` (`{ conversation, message }`),
  `whatsapp:message:status`, `whatsapp:conversation:updated`. Socket.IO isn't
  used — it can't run on Vercel functions; polling every 5 s is the fallback.

## 8e2. New-order alerts and feedback

- New orders on the kitchen screen (every new ticket) and the counter (guest
  QR orders only — not what the counter typed itself) play a loud double
  "ding-ding-ding" chime through a compressor at full page volume (a web page
  can't raise the device volume), buzz phones, and show a system notification
  per order (`lib/utils/orderNotification.ts`, via the service worker on
  Android; tapping it focuses the app). Permission is asked on the first tap.
- `TopProgress` (root layout) draws the brand line on top while an internal
  link navigates or a request the user started is running (any non-GET, or a
  GET within 800 ms of a tap); polling, realtime reloads and prefetches never
  show it. `(shell)/loading.tsx` and the `Skeleton*` components replace
  spinners.

## 8f. Phones

Everything is used on a phone — the guest's, and often the owner's — so:

- **Guest steps live in the URL** (`?v=cart|verify|status`, the menu is the
  bare QR link; `lib/guest/view.ts`). A phone browser reloads the document on
  back, which would otherwise recompute the step and strand the guest on the
  "order placed" screen. The bare URL therefore always resolves to the menu,
  even with an order cooking — it is the entry back walks to. Placing an order
  *replaces* the cart/verify step so it can't be re-sent, and a back press onto
  an emptied cart heals to the menu.
- **Admin tabs**: six labels don't fit one phone row and a hidden side-scroller
  leaves half of them undiscoverable, so phones get a two-row grid of short
  labels (`NavItem.shortLabel`) and the artboard's single row returns at `sm`.
- **Staff routing** is a card per login with category chips on phones; the
  matrix needs ~840px and its name column scrolls out of sight (`RoutingMatrix`).
- Bottom bars (guest menu/cart, counter order summary) clear the home
  indicator with `env(safe-area-inset-bottom)`.

## 8a. Design system & language

- The approved design canvas (link in CLAUDE_IMPLEMENTATION_PLAN.md) is the
  spec. Light theme only (the old auto dark mode was removed to match it);
  stone neutrals + `#c2410c` brand; Plus Jakarta Sans for Latin with Noto
  Sans Gujarati for Gujarati glyphs (`--font-jakarta`, `--font-noto-gujarati`
  in `layout.tsx`).
- Redesigned staff screens live under `app/(shell)/` and share
  `StaffHeader` (restaurant, EN/ગુ, account menu with Change PIN / Log out,
  role-filtered tabs from `components/shell/navItems.tsx`). Older screens
  (new order, live/kitchen orders, menu, reports) keep their own headers
  until their phase redesigns them.
- i18n: `lib/i18n/messages.ts` holds every key in `en` and `gu` (typed — a
  missing Gujarati key is a type error). The choice is a plain
  `jamavat_lang` cookie read by the root layout (`getLang()`), so server
  components, client components (`useI18n()`) and API error messages
  (`getTranslator()`) all agree. Zod's English messages are mapped to keys
  in `lib/i18n/zod.ts`.
- "Install app" appears only when the browser fires `beforeinstallprompt`
  (captured once in `ServiceWorkerRegister`); Safari never does.

## 9. PWA

- `src/app/manifest.ts` → `/manifest.webmanifest` (name, icons, standalone,
  theme color).
- `public/sw.js` — hand-written, no library. **`/api/*` and `/socket.io/*`
  are explicitly never intercepted**, and since staff login landed **only
  known static paths (`/_next/static/`, `/icons/`, `/brand/`, manifest,
  favicon) are ever served from cache** — RSC payloads for client-side
  navigation are per-user and must not be (cache v3 purged the old ones).
  Logout also clears the SW caches so the next person on a shared tablet
  can't get the previous one's offline page copy — order/menu/admin data must always
  come from the network, per the "no false success while offline"
  requirement. HTML page navigations are **network-first** (cache is only
  a fallback when the network fetch fails, i.e. genuinely offline); only
  static assets (JS/CSS/icons/manifest) use stale-while-revalidate.
  **This distinction is load-bearing, not stylistic**: a cache-first HTML
  page can reference a previous build's JS chunk hashes, and Turbopack
  dev (and any fresh deploy) doesn't guarantee old chunks stay servable —
  serving that stale HTML silently breaks hydration with no console error.
  This was caught during testing (a hard reload of `/pending-order` would
  hang on "લોડ થઈ રહ્યું છે…" forever) and fixed by switching navigations to
  network-first; don't revert page-navigation caching to cache-first/SWR
  without re-testing a hard reload after a code change.
- `OfflineIndicator` shows a persistent banner from `navigator.onLine` +
  `online`/`offline` events; no order/menu action pretends to succeed
  while offline.
- `public/brand/logo.png` is the official supplied logo (cloche/steam mark +
  જમાવટ wordmark + tagline), background-cleaned. `public/brand/icon-mark.png`
  is a cropped icon-only version (mark, no text — wordmarks don't read at
  favicon/app-icon sizes), used as the source for every generated icon size
  in `public/icons/` and `src/app/favicon.ico`. If the logo changes, redo
  both crops rather than hand-editing individual icon sizes.
- `AppLogo` renders `/brand/logo.png` with `unoptimized` on `next/image` —
  **deliberately bypassing** the `/_next/image` optimizer. Its dev-mode
  cache key didn't account for the source file's content changing (only
  url/width/quality), so overwriting `logo.png` in place kept serving the
  old bytes to any browser that had already loaded it, even after a hard
  reload — confirmed via curl (fresh) vs the browser (stale) returning
  different bytes for the identical URL. Static files under `public/` use
  Node's standard size+mtime ETag instead, which does change when the file
  changes. If you reintroduce `next/image` optimization for brand assets,
  either accept dev-mode staleness after hot-swapping a file, or version
  the filename (`logo.v2.png`) instead of overwriting in place.

## 10. Environment Variables

```
MONGODB_URI=              # MongoDB Atlas connection string (production)
HQ_EMAILS=                 # comma-separated addresses allowed into /hq — with none, HQ is closed
HQ_EMAIL=                  # where website inquiries are emailed (defaults to SMTP_USER)
LEGACY_RESTAURANT_SLUG=    # one-time: the link the existing restaurant gets at /r/{slug}
NEXT_PUBLIC_SITE_PHONE=    # shown on the website
NEXT_PUBLIC_SITE_EMAIL=
NEXT_PUBLIC_SITE_WHATSAPP= # digits only (919876543210) — the "Chat on WhatsApp" link
ADMIN_SESSION_SECRET=      # signs staff session cookies — `openssl rand -hex 32`
SETUP_KEY=                 # one-time key for /setup (falls back to ADMIN_PASSWORD)
NEXT_PUBLIC_APP_NAME=જમાવટ
PUSHER_APP_ID=             # Pusher Channels app (optional — without it screens poll)
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=            # e.g. ap2 (Mumbai)
NEXT_PUBLIC_PUSHER_KEY=    # same as PUSHER_KEY
NEXT_PUBLIC_PUSHER_CLUSTER=  # same as PUSHER_CLUSTER
SMTP_USER=                 # Gmail address that sends guest OTP / bill emails
SMTP_PASS=                 # Gmail App Password (16 chars, needs 2-step verification)
SMTP_HOST=                 # optional, default smtp.gmail.com
SMTP_PORT=                 # optional, default 465 (TLS)
MAIL_FROM=                 # optional sender address, default SMTP_USER
APP_URL=                   # optional, e.g. https://jamavat.vercel.app — origin printed in QRs
BLOB_READ_WRITE_TOKEN=     # added by Vercel when a public Blob store is connected — dish photos
WHATSAPP_ACCESS_TOKEN=     # Cloud API token — server-only, never NEXT_PUBLIC_, never logged
WHATSAPP_PHONE_NUMBER_ID=  # our number; webhook events for other ids are ignored
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_VERIFY_TOKEN=     # verify token for the WhatsApp Cloud API webhook (/api/whatsapp/webhook)
WHATSAPP_GRAPH_API_VERSION=  # default v26.0
WHATSAPP_WEBHOOK_URL=      # informational: https://jamavat.vercel.app/api/whatsapp/webhook
WHATSAPP_APP_SECRET=       # optional: enables X-Hub-Signature-256 checking on webhook POSTs
```

Set `APP_URL` in production: without it QR links use the host the admin
opened the Tables page on, so printing from a preview deployment would put
the preview URL on the tables.

Rotating `ADMIN_SESSION_SECRET` logs every device out.

`.env.example` documents placeholders only. `.env.local` (gitignored) holds
real values locally; Vercel Environment Variables hold them in production.
Never logged, never sent to the client, never committed.

## 11. Local Development

```bash
npm install
cp .env.example .env.local   # then fill in MONGODB_URI + ADMIN_SESSION_SECRET
npm run dev
```

`MONGODB_URI` can point at MongoDB Atlas **or** a local `mongod` — both work
identically since it's a standard Mongoose connection string.

Running two copies of the app on different localhost ports in one browser?
Cookies are per host, not per port, so they share the staff cookie — a
screen on one copy will see the other's cookie as revoked and delete it.
Use a separate browser profile for the second copy. A local
Mongo is convenient for development; Atlas is required for production per
the fixed project decisions.

## 12. Verified Behavior

The following were exercised directly against a running instance (not just
read from code) during this build:

- Menu add (multi-row) → immediately visible in New Order, grouped by
  category.
- New Order: tap-to-add, quantity badges, +/- in the summary, swipe-to-send,
  token popup, auto-return home.
- Idempotency: two concurrent `POST /api/orders` with the same
  `clientRequestId` → same order, same token, no duplicate.
- Race protection: two concurrent `complete` calls on one order → exactly
  one `200`, the other `409`.
- Realtime: an order created on one device appeared on a kitchen screen on
  another device with no manual refresh; complete/cancel removed it from
  both live and pending views live; admin stats updated live on order
  create/complete/cancel.
- Live Order complete/cancel → returns home; Pending Order complete/cancel
  → stays put (Home button only), matching the two screens' different
  specified behavior.
- Hard reload (not just in-app navigation) of every realtime page —
  New Order, Live Order, Pending Order, Developer — after the service
  worker fix in §9; this is what surfaced the stale-HTML bug in the first
  place, so it was re-checked after the fix, not assumed fixed.
- Admin login/logout, wrong-credentials rejection, and stats math (today's
  count/revenue, completed/cancelled counts, date-wise breakdown) all
  checked against the underlying data.
- Mobile (375px), tablet, and desktop layouts; offline banner.
- `npm run lint`, `npm run build`, and `next start` (production mode) all
  clean.
- Phase 3 (QR dine-in), against `next start` with a local SMTP sink and an
  isolated database: setup → tables 4 (4A, 4B) + Garden → staff with
  kitchen routing; guest page + noindex; invalid QR page; order before OTP
  → 401 VERIFY; OTP email received (from the restaurant's name), resend
  too soon → 429, wrong code, code reuse refused, verify; order → PLACED;
  same `clientRequestId` → same order; second phone sees "taken" and gets
  409 SEAT_TAKEN; kitchen can't see or accept PLACED; counter accept
  (twice → 409); kitchen ticket shows seat + note + only its items;
  partial then full ready visible to the guest; reject of the only order
  frees the QR; can't delete a QR in use; counter frees a QR → next guest
  orders; regenerated QR → old link dead; QR SVG is admin-only and decodes
  to the guest URL; print sheet has every QR. In the browser at phone
  width: menu (tabs only with 2+ menus, category chips), cart + note, OTP
  boxes, live status (EN and ગુજરાતી), "Order more" skipping OTP, busy and
  invalid-QR screens; counter, tables and print pages.

## 13. Deliberate Scope Boundaries

Per the build brief, these were intentionally **not** added: customer
accounts/online payment (guests only verify an email by OTP), roles/CRM/inventory/reports beyond what's
specified, and no extra libraries (state management, UI kit, ORM
alternatives, PWA plugin) beyond what's listed in §2 — each would add
surface area the brief explicitly excludes for v1.

## 14. Vercel / Production Notes

- Vercel's native WebSocket support is still in public beta; this app is
  built so that's an upgrade path, not a requirement — with polling/resync
  in place, the app is correct even if realtime never connects at all, just
  less instant.
- If you deploy to standard Vercel serverless functions and see realtime
  feel less "instant" than in local dev, that's expected: different API
  routes can land on different function instances. Nothing breaks — every
  screen resyncs from MongoDB on its own poll/reconnect cycle. If you need
  guaranteed sub-second delivery in production, evaluate Vercel's Fluid
  Compute / WebSocket beta for this project before relying on it.
- Rotate `ADMIN_SESSION_SECRET` and `MONGODB_URI` if they were ever
  exposed outside a private environment.

## 15. Multi-restaurant (tenancy)

Every collection that belongs to one restaurant carries `restaurantId`, and
`lib/db/tenant.ts` makes that impossible to forget: `tenantGuard` throws on
any find, update, delete, count, distinct, aggregate or bulkWrite whose
filter doesn't name a restaurant. A missing filter fails loudly in
development instead of quietly reading or changing another restaurant's
data. The two deliberate ways past it:

- `{ crossTenant: true }` on a query (`resolveSeat`, which turns a QR token
  into its restaurant; `getCurrentStaff` for a cookie issued before
  tenancy; HQ's totals in `lib/hq/restaurants.ts`).
- Collections that belong to nobody in particular: Restaurant, Plan,
  Inquiry, SubscriptionPayment, EmailOtp (scoped by a `scope` string
  instead) and Counter (keyed `"{restaurantId}:{businessDate}"` and
  `"{restaurantId}:bill"`).

Where the restaurant comes from, per request:

| Caller | Source |
|---|---|
| Staff page | `requirePageStaff(slug, path)` — the session, and it must match the link |
| Staff API | `requireStaff(roles)` → `staff.restaurantId`, never the URL or body |
| Guest API | the seat token (`resolveSeat`) |
| WhatsApp webhook | `phone_number_id` → `Restaurant.whatsappPhoneNumberId` |
| HQ | not a restaurant at all — its own cookie (§17) |

Other per-restaurant things: Pusher channels (`private-staff-{id}`,
`private-whatsapp-{id}`, signed by `/api/pusher/auth` only for that
restaurant's own staff), dish photos (`restaurants/{id}/dishes/…` in Blob),
the PWA manifest (`/r/{slug}/manifest.webmanifest`, `start_url` its own
login) and unique indexes (staff name, daily token number, bill number,
wa_id — all now `{restaurantId, …}`).

Old links keep working: `proxy.ts` sends `/`, `/counter`, `/login` and the
rest to `/r/{slug}/…` using the slug in the session cookie, and a cookie
from before tenancy through `/go`, which reads the restaurant once and
re-issues the cookie. A renamed link redirects from `previousSlugs`.

`lib/db/migrate.ts` runs once on the first database connect, behind a lock
in a `migrations` document: it stamps `restaurantId` everywhere, gives the
existing restaurant a slug and ACTIVE with no end date, drops the old global
unique indexes and carries today's token and bill counters across. Covered
by `tests/migrate.int.test.ts` (skipped unless `MONGODB_TEST_URI` names a
throwaway database — never point it at `JAMAVATDATA`).

`/setup` is gone. HQ creates a restaurant and emails a one-time invite link
(`/r/{slug}/welcome?invite=…`, hashed, 14 days, dead once that restaurant
has any staff) that makes the first admin login.

## 16. The Jamavat website (`/`)

A `(site)` route group with its own layout: server-rendered, no service
worker, no staff session, readable without JavaScript. English lives at
`/…` and ગુજરાતી at `/gu/…` — two real addresses with canonical and
hreflang, because a cookie-switched single URL can't be indexed in both.

- Pages: home, `/pricing`, `/terms`, and one page per thing owners search
  for (`/restaurant-management-software`, `/qr-code-ordering-system`,
  `/kitchen-display-system`, `/restaurant-billing-software`), each with its
  own title, description and body.
- Copy: `lib/site/content.ts` as `{en, gu}` pairs (long-form marketing text,
  kept out of the app's `messages.ts`). `tests/siteUrls.test.ts` checks both
  languages are filled in and that titles and descriptions are the length a
  search result actually shows.
- JSON-LD in `lib/site/jsonLd.ts`: Organization, SoftwareApplication,
  FAQPage, BreadcrumbList — only facts the page states, never invented
  ratings. `sitemap.ts` lists both languages per page; `robots.ts` disallows
  `/r/`, `/t/`, `/hq`, `/go` and `/api/`.
- Pricing shows only the plans HQ marked public; with none it says so and
  points at the form rather than inventing a price.
- `POST /api/inquiries` → an `Inquiry` plus an email to `HQ_EMAIL`. Guarded
  by a hidden honeypot field (a bot gets the same "thanks" answer), an
  hourly per-address limit, and a de-dupe on the phone number inside a day
  so one owner submitting twice stays one lead.

## 17. HQ (`/hq`) and subscriptions

HQ is the owner's own panel, with its own cookie (`jamavat_hq_session`,
30 days) and its own sign-in: a 6-digit code emailed to an address on the
server's `HQ_EMAILS` allowlist. The allowlist is re-read on every request,
so removing an address locks that device out at once, and the "send code"
step answers the same whatever address is typed. The guest test-inbox
shortcut does not apply to the `hq` OTP scope.

Screens: restaurants (add one with a trial and an invite link; open one to
run its subscription), inquiries, plans. The sign-in page sits outside the
guarded route group so it can't redirect to itself.

**Subscription** (`lib/subscription.ts`): `Restaurant.status` is what HQ
set (TRIAL / ACTIVE / SUSPENDED / CANCELLED); `paidUntil` is when the trial
or paid period ends (empty = no end date). Together with `graceDays` that
gives the state the app acts on:

| State | What happens |
|---|---|
| `ok` | everything works; the admin sees a line in the last 7 days |
| `due` | past `paidUntil`, inside the grace days — everything still works, louder line |
| `expired` | **no new orders**, counter or QR; settling open tables and reports keep working |
| `suspended` / `cancelled` | HQ switched it off: staff can't use the app, guests see "not taking orders" |

`requireStaff(roles, { orders: true })` is what enforces it on the routes
that create orders (402); `/api/guest/orders` checks the same thing (503).
Plan limits (`lib/limits.ts`) are checked where things are created — the
11th QR on a 10-QR plan is refused with a translated message, while the QRs
that already exist keep working.

HQ's "Record a payment" writes a `SubscriptionPayment` and moves
`paidUntil` forward (from the current end if it hasn't passed, else from
today), turning a trial into ACTIVE. That model already carries `provider`,
a unique `providerRef` and `rawPayload`, so Razorpay's webhook writes the
same rows later without changing what anything else reads.

## 18. Missing Information Checklist

- [ ] Production domain
- [ ] MongoDB Atlas production connection string
- [ ] Vercel project
- [ ] Production environment variables (set in Vercel, not committed)
- [ ] `ADMIN_SESSION_SECRET` for production (generate a fresh one, don't
      reuse the local dev one)
- [x] Official જમાવટ logo file — supplied and integrated (see §9)
- [ ] Final menu items/prices for launch
- [ ] Any restaurant-specific business rules not yet defined
