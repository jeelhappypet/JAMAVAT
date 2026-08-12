# જમાવટ — Project Architecture

Restaurant order management PWA. Gujarati-first UI, no public login, single
Next.js project for frontend + backend, MongoDB Atlas persistence, Socket.IO
realtime.

## 1. Overview

- Counter creates an order in **નવો ઓર્ડર** → kitchen sees it instantly in
  **બાકી ઓર્ડર** → kitchen marks complete/cancel → counter tracks active
  orders in **ચાલુ ઓર્ડર** → owner reviews stats at `/developer`.
- Home (`/`) has no login and shows exactly 4 CTAs: નવો ઓર્ડર, ચાલુ ઓર્ડર,
  બાકી ઓર્ડર, મેનુ.
- MongoDB is always the source of truth. Realtime is a notification layer —
  every screen also polls and resyncs, so correctness never depends on a
  socket being connected.

## 2. Technology Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS v4 (CSS-based theme in `src/app/globals.css`)
- MongoDB Atlas + Mongoose
- Socket.IO (server + client) for realtime
- Zod for server-side request validation
- `next/font/google` — Noto Sans Gujarati
- Custom minimal service worker (no PWA library) + `app/manifest.ts`

No ORM/auth/state-management libraries were added beyond the above — see
§13 for why.

## 3. Folder Structure

```
src/
├── app/
│   ├── page.tsx                  Home (4 CTAs)
│   ├── manifest.ts                PWA manifest (served at /manifest.webmanifest)
│   ├── new-order/page.tsx
│   ├── live-order/page.tsx
│   ├── pending-order/page.tsx
│   ├── menu/page.tsx
│   ├── menu/add/page.tsx
│   ├── developer/page.tsx
│   └── api/
│       ├── menu/route.ts                      GET/POST/PATCH
│       ├── orders/route.ts                    POST (create)
│       ├── orders/live/route.ts                GET
│       ├── orders/pending/route.ts             GET
│       ├── orders/[id]/complete/route.ts       PATCH
│       ├── orders/[id]/cancel/route.ts         PATCH
│       └── developer/{login,logout,stats}/route.ts
├── pages/api/socket.ts            Socket.IO server bootstrap (see §7)
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
│   ├── auth/session.ts            HMAC-signed admin session cookie
│   ├── realtime/                  events.ts, server.ts (emitter), useRealtime.ts
│   ├── orders/                    serialize.ts, queries.ts, useActiveOrders.ts
│   ├── validation/                zod schemas (menu/order/developer)
│   └── utils/businessDate.ts      Asia/Kolkata business-date helper
├── models/           MenuItem.ts, Order.ts, Counter.ts
└── types/index.ts    shared DTOs + category/status enums
```

`features/` from the originally suggested structure was folded into
`components/<domain>` + `lib/<domain>` — a separate layer would just
re-export the same hooks/components without adding a real boundary.

## 4. Database Schema

**MenuItem** — `name`, `category` (શાક / રોટલી / મીઠાઈ / અન્ય), `price`,
`isActive`, timestamps. Indexed on `{category, isActive}`.

**Order** — `tokenNumber`, `businessDate` (YYYY-MM-DD, Asia/Kolkata),
`customerName?`, `items[]` (menuItemId + **snapshot** of name/category/price
at order time, quantity, lineTotal), `totalAmount`, `status`
(`PENDING`/`READY`/`COMPLETED`/`CANCELLED`), `clientRequestId` (idempotency
key), `createdAt`/`readyAt`/`completedAt`/`cancelledAt`. Indexes:
`{businessDate, status}`, unique `{businessDate, tokenNumber}`,
`{createdAt}`, unique-sparse `{clientRequestId}`.

Snapshots mean a menu price change today never rewrites yesterday's orders.

**Counter** — `_id` = businessDate, `seq`. One doc per business day;
`findOneAndUpdate({_id: businessDate}, {$inc:{seq:1}}, {upsert:true})` is
the atomic token generator (see §6).

## 5. API Routes

| Method | Path | Purpose |
|---|---|---|
| GET/POST/PATCH | `/api/menu` | list (all, or `?activeOnly=1`) / bulk-create / update (incl. soft-delete via `isActive`) |
| POST | `/api/orders` | create order, idempotent on `clientRequestId` |
| GET | `/api/orders/live` | today's `PENDING` + `READY` orders — counter view |
| GET | `/api/orders/pending` | today's `PENDING` orders only — kitchen view |
| PATCH | `/api/orders/[id]/ready` | atomic `PENDING → READY` — kitchen's only action |
| PATCH | `/api/orders/[id]/complete` | atomic `(PENDING\|READY) → COMPLETED` — counter only |
| PATCH | `/api/orders/[id]/cancel` | atomic `(PENDING\|READY) → CANCELLED` — counter only |
| POST | `/api/developer/login` \| `/logout` | admin session cookie |
| GET | `/api/developer/stats` | aggregated stats, requires session |

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

Events (all on one Socket.IO connection, minimal payloads):
`order:created`, `order:completed`, `order:cancelled`, `menu:updated`,
`admin:stats-updated`.

**Why the socket server lives in `src/pages/api/socket.ts`:** the App
Router's Response-based route handlers don't expose the raw Node HTTP
server that Socket.IO needs to attach to. The Pages Router's
`res.socket.server` does. The io instance is mirrored into a `globalThis`
singleton (`lib/realtime/server.ts`) so any App Router API route in the
same process can call `emitRealtimeEvent(...)` after a DB write.

**Client transport is WebSocket-only** (`transports: ["websocket"]`).
During development we found the HTTP long-polling handshake path is
fragile in this dev setup and connection-hungry (multiple tabs/devices
polling the same origin can exhaust the browser's per-origin connection
pool); forcing WebSocket avoids both and is the transport Vercel's beta
WebSocket support targets anyway.

**Every realtime consumer also polls** (`useActiveOrders` every 5s;
`/menu` and New Order's menu fetch every 30s; admin stats every 20s —
every `useRealtime` caller also resyncs immediately on reconnect). This is
not a fallback bolted on for safety theatre — it's load-bearing: on a
serverless deployment, the API route that emits an event and the function
instance holding a given client's socket connection are not guaranteed to
be the same process, so a missed emit is an expected possibility, not an
edge case. MongoDB stays authoritative regardless. **Confirmed in
production on Vercel's standard serverless Functions**: the socket never
reaches `connected` at all (no persistent process to hold a WebSocket
open), so the app runs entirely on polling there today — every screen
still ends up correct within its poll interval, just not push-instant.
`useRealtime`'s `CONNECT_GRACE_MS` (4s) is what stops the status badge
from showing "connecting…" forever in that situation — it settles into
"સ્વયં તાજું થાય છે" (auto-refreshing) instead, which is accurate, not an
error state.

If genuine sub-second cross-device push is needed later, the concrete fix
is an external pub/sub (Ably/Pusher, both have a free tier) that all
serverless instances can publish/subscribe to — this is exactly the
"concrete Vercel limitation" the original brief anticipated as the bar
for adding one. Vercel's Fluid Compute + WebSocket beta is the other path
but depends on account/plan enablement outside this codebase's control.
Do not attempt to "fix" this by changing `transports` back to include
`polling` — the Pages API handler in `src/pages/api/socket.ts` calls
`res.end()` unconditionally on every request, which was found (via a
local curl test returning an empty body for a polling handshake) to
race with Engine.IO's own response for that transport. WebSocket-only
sidesteps it because upgrade requests never go through that handler at
all — but fixing polling too would need reworking that handler, not just
a client-side transport change.

## 8. Admin Authentication

`/developer` has no page-level gate — it always renders, then the client
asks `GET /api/developer/stats`. A `401` shows the login form; `200` shows
the dashboard with the data already in hand (no second round trip).

Session = `base64url(JSON {username, exp}) + "." + HMAC-SHA256(secret)`,
stored in an **HttpOnly, SameSite=Lax** cookie (`Secure` in production),
verified server-side with `crypto.timingSafeEqual`. Credentials
(`ADMIN_USERNAME`/`ADMIN_PASSWORD`) are also compared with
`timingSafeEqual`. Nothing admin-related touches `localStorage` or the URL.

## 9. PWA

- `src/app/manifest.ts` → `/manifest.webmanifest` (name, icons, standalone,
  theme color).
- `public/sw.js` — hand-written, no library. **`/api/*` and `/socket.io/*`
  are explicitly never intercepted** — order/menu/admin data must always
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
ADMIN_USERNAME=jamavat
ADMIN_PASSWORD=jamavat
ADMIN_SESSION_SECRET=      # random secret, e.g. `openssl rand -hex 32`
NEXT_PUBLIC_APP_NAME=જમાવટ
```

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
