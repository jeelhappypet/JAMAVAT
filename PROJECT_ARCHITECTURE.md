# જમાવટ — Project Architecture

Restaurant order management PWA. English + ગુજરાતી (EN/ગુ toggle; screens
not yet redesigned still carry hardcoded Gujarati), staff PIN login, single
Next.js project for frontend + backend, MongoDB Atlas persistence, Pusher
realtime.

## 1. Overview

- Counter creates an order in **નવો ઓર્ડર** → kitchen sees it instantly in
  **બાકી ઓર્ડર** → kitchen marks complete/cancel → counter tracks active
  orders in **ચાલુ ઓર્ડર** → owner reviews stats at `/developer`.
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
│   │                              page.tsx (home cards), staff/, settings/
│   ├── login/ setup/             PIN login, first-run setup (restaurant + admin)
│   ├── manifest.ts                PWA manifest (served at /manifest.webmanifest)
│   ├── new-order/page.tsx
│   ├── live-order/page.tsx
│   ├── pending-order/page.tsx
│   ├── menu/page.tsx
│   ├── menu/add/page.tsx
│   ├── developer/page.tsx
│   └── api/
│       ├── auth/{login,logout,setup,change-pin,expire}/route.ts
│       ├── restaurant/route.ts                PATCH restaurant name (admin)
│       ├── staff/route.ts, staff/[id]/route.ts  admin staff management
│       ├── menu/route.ts                      GET/POST/PATCH
│       ├── orders/route.ts                    POST (create)
│       ├── orders/live/route.ts                GET
│       ├── orders/pending/route.ts             GET
│       ├── orders/[id]/complete/route.ts       PATCH
│       ├── orders/[id]/cancel/route.ts         PATCH
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
│   ├── orders/                    serialize.ts, queries.ts, kitchen.ts (routing), useActiveOrders.ts
│   ├── menu/structure.ts          menu tree loader + v1 → v2 migration
│   ├── validation/                zod schemas (menu/order/developer)
│   └── utils/businessDate.ts      Asia/Kolkata business-date helper
├── models/           MenuItem.ts, Order.ts, Counter.ts, Staff.ts, Restaurant.ts
└── types/index.ts    shared DTOs + category/status enums
```

`features/` from the originally suggested structure was folded into
`components/<domain>` + `lib/<domain>` — a separate layer would just
re-export the same hooks/components without adding a real boundary.

## 4. Database Schema

**Menu** → **Category** → **MenuItem** (v2, fully dynamic). A Menu is e.g.
"Gujarati" or "Punjabi" (`name`, optional `nameGu`, `sortOrder`, `isActive`);
a Category belongs to a menu and is the unit of kitchen routing; a MenuItem
has `categoryId`, `name`, `nameGu?`, `price`, `isVeg`, `isActive` (hidden
by the admin) and `isAvailable` (sold out — kitchens can flip it).

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
(`PENDING`/`READY`/`COMPLETED`/`CANCELLED`), `clientRequestId` (idempotency
key), `createdAt`/`readyAt`/`completedAt`/`cancelledAt`. Indexes:
`{businessDate, status}`, unique `{businessDate, tokenNumber}`,
`{createdAt}`, unique-sparse `{clientRequestId}`.

Snapshots mean a menu price change today never rewrites yesterday's orders.

**Staff** — `name` (unique, case-insensitive), `role` (`ADMIN`/`COUNTER`/
`KITCHEN`), `pinHash` + `pinSalt` (scrypt, per-staff salt), `isActive`,
`sessionVersion`, `failedPinAttempts`, `lockedUntil`, `categoryIds` (kitchen
routing — which categories' items this login's kitchen screen receives).

**Restaurant** — `name`. A single document for now (shown on login and in
every staff header); it becomes one-per-tenant in the multi-restaurant phase.

**Counter** — `_id` = businessDate, `seq`. One doc per business day;
`findOneAndUpdate({_id: businessDate}, {$inc:{seq:1}}, {upsert:true})` is
the atomic token generator (see §6).

## 5. API Routes

Every route checks the session with `requireStaff(roles)` (401 = not
logged in / session revoked, 403 = wrong role). Role groups live in
`lib/auth/access.ts` (`ROLES.admin`, `.counter` = admin+counter,
`.kitchen` = admin+kitchen, `.anyStaff`).

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
| POST | `/api/menu/reorder` | admin | display order of menus or categories |
| POST | `/api/pusher/auth` | any staff | signs the private realtime channel subscription |
| POST | `/api/orders` | counter | create order, idempotent on `clientRequestId` |
| GET | `/api/orders/next-token` | counter | next token preview |
| GET | `/api/orders/live` | counter | today's `PENDING` + `READY` orders |
| GET | `/api/orders/pending` | kitchen | the caller's tickets: only items in its categories still PENDING, plus how many are left on other screens |
| PATCH | `/api/orders/[id]/ready` | kitchen | marks the caller's items READY; the order turns READY when no item anywhere is PENDING |
| PATCH | `/api/orders/[id]/complete` | counter | atomic `(PENDING\|READY) → COMPLETED` |
| PATCH | `/api/orders/[id]/cancel` | counter | atomic `(PENDING\|READY) → CANCELLED` |
| GET | `/api/developer/stats` | admin | aggregated stats |

There's no `DELETE /api/menu/:id` — `isActive` soft-delete was chosen
instead because orders reference `menuItemId`, and hiding an item from new
orders shouldn't touch history.

## 6. Order Lifecycle & Token Generation

`PENDING → READY → COMPLETED`, or `(PENDING|READY) → CANCELLED`,
server-controlled only. This is a deliberate 4-status model (not the
original 3-status PENDING/COMPLETED/CANCELLED) added after real kitchen
use: the kitchen's job is only to say "I've cooked it" (`READY`), not to
decide an order is fully done — that's the counter's call once it's
actually served. Consequences of this split:

- **Kitchen (Pending Order) has exactly one action** — mark ready. No
  cancel button at all; cancellation authority belongs entirely to the
  counter. Marking ready removes the order from the kitchen's own queue
  (`/api/orders/pending`, `status: PENDING` only) but must never remove it
  from the counter's queue.
- **Counter (Live Order) queries `PENDING` and `READY` together**
  (`/api/orders/live`) and keeps both complete and cancel actions on
  either status. An order only ever leaves the counter's screen when the
  counter itself completes or cancels it — kitchen's `ready` action changes
  its badge (બની રહ્યું છે → તૈયાર છે) in place, never removes it.

Every transition uses an atomic `findOneAndUpdate` filtered by the
statuses it's allowed to start from (e.g. complete/cancel match
`{status: {$in: ["PENDING","READY"]}}`) — if another request already
moved the order, this matches zero documents and the route returns `409`
with a Gujarati "already processed" message. This is what makes
double-tap-complete, ready-after-cancel, etc. safe (verified in testing —
see §12).

Token numbers come from the `Counter` doc for the current Asia/Kolkata
business date, incremented atomically. `POST /api/orders` also de-dupes on
`clientRequestId`: if the same id already produced an order, the existing
order is returned instead of creating a second one — this is what makes a
double-swipe (or a retried request after a flaky network) safe.

## 7. Realtime

Pusher Channels, one **private** channel (`private-staff`; becomes one per
restaurant in the multi-restaurant phase). Private means pusher-js must get
a signature from `/api/pusher/auth`, which requires a staff session — guests
and logged-out browsers can't listen to order events.

Events: `order:created`, `order:items-ready` (one kitchen finished its
part), `order:ready` (whole order), `order:completed`, `order:cancelled`,
`menu:updated`, `staff:routing-updated`, `admin:stats-updated`.

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
ADMIN_SESSION_SECRET=      # signs staff session cookies — `openssl rand -hex 32`
SETUP_KEY=                 # one-time key for /setup (falls back to ADMIN_PASSWORD)
NEXT_PUBLIC_APP_NAME=જમાવટ
PUSHER_APP_ID=             # Pusher Channels app (optional — without it screens poll)
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=            # e.g. ap2 (Mumbai)
NEXT_PUBLIC_PUSHER_KEY=    # same as PUSHER_KEY
NEXT_PUBLIC_PUSHER_CLUSTER=  # same as PUSHER_CLUSTER
```

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
identically since it's a standard Mongoose connection string. A local
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

## 13. Deliberate Scope Boundaries

Per the build brief, these were intentionally **not** added: customer
login/OTP/payment, image upload, roles/CRM/inventory/reports beyond what's
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

## 15. Missing Information Checklist

- [ ] Production domain
- [ ] MongoDB Atlas production connection string
- [ ] Vercel project
- [ ] Production environment variables (set in Vercel, not committed)
- [ ] `ADMIN_SESSION_SECRET` for production (generate a fresh one, don't
      reuse the local dev one)
- [x] Official જમાવટ logo file — supplied and integrated (see §9)
- [ ] Final menu items/prices for launch
- [ ] Any restaurant-specific business rules not yet defined
