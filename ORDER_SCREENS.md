# Order screens — rebuild plan

Status board for the counter/order screens. **Read this and `CLAUDE.md` before
touching anything in `src/components/counter`, `src/components/orders` or
`src/components/kitchen`.** Tick a phase off here in the same commit that does
the work, so whoever picks this up next knows where it stopped.

---

## Why

The public website was rebuilt first (see git log). These are the screens staff
actually live in during service, and they have three problems:

1. **They are documents, not a POS.** `/new-order` is one long scrolling page
   with a floating cart. With a real menu (this restaurant has ~30 dishes
   across two menus) the person taking the order scrolls past the cart to find
   a dish. Petpooja's billing POS is one screen that never scrolls as a whole:
   categories, dishes and the bill are three panes that scroll independently.
   They advertise it as "3-click billing" and "a single screen" — that is the
   target.
2. **Calls that are not needed.** `SeatsScreen` fetches the entire menu tree
   (`/api/menu`) on every load and on every `MENU_UPDATED` event, purely to turn
   a `categoryId` into a kitchen name for a label on one card. `CLAUDE.md`
   already forbids exactly this ("never fetch a whole tree for one label").
3. **Screens hand-style what should be components.** `Stat`, `Legend` and
   `SeatTile` are private functions inside `SeatsScreen.tsx`; tiles use raw
   `orange-100` / `stone-300` rather than brand tokens. Each screen that needs
   the same thing grows its own copy.

## Rules for this work

- **Components first, screens second.** Build the reusable piece in
  `src/components/ui/` (or `src/components/orders/`), get it right on its own,
  then swap screens over. Do not inline a new widget into a screen "for now".
- **No hand-rolled JS dropdowns.** A dropdown is `Select` (native `<select>`).
  Native gets the platform's own picker on a phone, keyboard support and
  accessibility for free — all things a `<div>` listbox has to reimplement and
  usually gets wrong. A menu of *actions* (not a value chooser) may use
  `SidePanel` or `Modal`.
- **One screen, the fewest calls.** Before adding a `fetch`, check whether the
  field can be added to a response the screen already asks for. A call that
  fires on a timer needs `usePeriodicRefresh`; never a bare `setInterval`.
- **Animation where it tells you something** — a dish landing in the bill, a
  total changing, a ticket arriving. Not decoration on a screen someone is
  working on at speed. Every rule needs a `prefers-reduced-motion` reset.
- **Responsive is not an afterthought.** Every screen is checked at 390 (phone),
  834 (tablet, the likeliest counter device) and 1440 (laptop). A POS pane
  layout at 1440 becomes stacked sheets at 390.
- Finish with `npx tsc --noEmit`, `npx eslint src`, `npm test`, `npm run build`.

## How to see these screens locally

They are behind a staff PIN. To screenshot them without one, mint a session
cookie from `.env.local` — the same trick used while building this:

```bash
npm run build && npx next start -p 3100
```

Then a throwaway script that signs `{sid, sv, role, rid, slug, iat}` (base64url)
with `HMAC-SHA256(ADMIN_SESSION_SECRET)` and sets it as `jamavat_staff_session`
— see `src/lib/auth/session.ts` for the exact shape. The dev database has two
restaurants, `gurukrupa` and `chokozu`.

---

## Phases

### Phase 1 — shared pieces  ☑ done

Build and test on their own; no screen changes yet.

| Piece | Where | Notes |
|---|---|---|
| `SearchField` | `components/ui/` | `TextField` with a search icon and a clear button. The POS is unusable without it past ~20 dishes. |
| `StatCard` | `components/ui/` | The four figures on the counter header. Replaces the private `Stat` in `SeatsScreen`. |
| `CategoryRail` | `components/orders/` | Scrollable category/menu navigation, horizontal on a phone and vertical on a laptop. Scroll-spy, no router. |
| `DishTile` | `components/orders/` | One dish: name (both languages), price, veg mark, sold-out state, quantity stepper once it is in the bill. |
| `OrderCart` | `components/orders/` | The running bill: lines, quantity, note, total, payment mode, send. Its own scroll area. |
| `PosLayout` | `components/orders/` | The three-pane shell that does not scroll as a whole. Stacks to sheets under `md`. |
| `SeatTile` | `components/counter/` | Out of `SeatsScreen`, onto brand tokens instead of `orange-100`/`stone-300`. |

All seven exist and typecheck. Only `StatCard`, `Legend` and `SeatTile` are
wired into a screen so far (`SeatsScreen`); the other four are built and
waiting for Phase 3, which is the screen they were made for.

Motion for staff screens was added to `globals.css` at the same time —
`fade-in`, `sheet-up`, `animate-line-in`, `animate-line-bump`, `tap-tile` —
kept apart from the website's rules, with the same `prefers-reduced-motion`
resets. These are screens people work on at speed, so movement only ever says
"this arrived" or "this changed".

### Phase 2 — stop the calls that are not needed  ☑ done

`kitchenSnapshot` is now stored on the order item when the order is built
(`lib/orders/build.ts`), not resolved on every read — it is a snapshot like
the name and price, so renaming a menu never rewrites yesterday's orders. It
costs one small extra query over the one or two menus involved, once, at order
creation. Orders placed before this fall back to `categorySnapshot`.

`SeatsScreen` no longer asks for the menu. Measured on `/counter`:

| | before | after |
|---|---|---|
| on load | `/api/orders/live`, `/api/tables`, **`/api/menu`** | `/api/orders/live`, `/api/tables` |
| per `MENU_UPDATED` event | a full menu tree | nothing |

`/new-order` still calls `/api/menu`, which is correct — it is the menu.

**Still open for a later pass:** audit the remaining `useCounterData({...})`
call sites (each `true` is a request), and check `/api/orders/live` `.select()`s
only the fields the screens read.

### Phase 3 — `/new-order` as a real POS  ☑ done

The core screen. Target layout at 1440:

```
┌────────────┬───────────────────────────────┬──────────────────┐
│ categories │ search                        │  Token 7         │
│  (rail)    │ ┌─────┬─────┬─────┬─────┐     │  ───────────     │
│  Gujarati  │ │dish │dish │dish │dish │     │  2 × Thali  ₹560 │
│   Shaak    │ ├─────┼─────┼─────┼─────┤     │  1 × Rotli   ₹12 │
│   Rotli    │ │dish │dish │dish │dish │     │                  │
│  Punjabi   │ └─────┴─────┴─────┴─────┘     │  Paid by …       │
│            │        (scrolls)              │  Swipe to send   │
└────────────┴───────────────────────────────┴──────────────────┘
        each pane scrolls on its own; the page does not
```

Built as drawn. Phone and tablet get the dishes full width, the categories as
a scrolling top strip, and the bill as a bottom sheet behind an always-visible
"Token 1 · 3 pcs · ₹200 / Open bill" bar. Veg / non-veg is a `SegmentedControl`;
`SwipeToSend` is unchanged.

Verified in a real browser at 390 / 834 / 1440:

| | result |
|---|---|
| page scrolls | **no** — body is exactly the window height at all three widths |
| API calls on load | `/api/menu`, `/api/orders/next-token` (a seat order calls `/api/seats/{id}` instead of the token — never both) |
| phone sheet | opens, shuts on Escape and on a tap outside |
| category rail | follows the grid as it scrolls, and jumps on click |
| search | filters on both spellings (`rot` finds રોટલી) |

**Three things worth knowing, all found by testing rather than by reading:**

1. `flex-1` on the pane root silently beat the measured `height`. `flex: 1 1 0%`
   hands the main size to flex layout, so the explicit height was ignored and
   the page kept scrolling. The root must not be a flex-grow item.
2. The height has to allow for *every* ancestor's bottom padding, not the
   parent's. The shell's `<main>` has `pb-12` two levels up, and without it the
   panes ended up 48px taller than the window.
3. The bill was rendered twice — once in the desktop column, once in the sheet,
   with one hidden by `lg:hidden`. Every control in it existed twice in the DOM
   at every width. It is now rendered into one place or the other via
   `matchMedia`, never both.

**Known, not fixed here:** on a 390px phone the staff header takes three rows
(~170px of a 780px screen) before the POS starts. That is `StaffHeader`, shared
by every screen — Phase 4 or 6.

### Phase 4 — `/counter` (seats) and `/counter/orders`  ☑ done

- `OrderTicket` lifted out of `OrdersScreen`, where it was a 50-line function
  declared *inside* the component — rebuilt on every tick of the minute timer,
  and unusable anywhere else. Raw `green-600` / `amber-500` / `orange-50` on it
  are now `success` / `brand-strong` / `brand-light`.
- `useArrivals` (`components/orders/`): the ids that appeared since the screen
  was opened, so a new ticket arrives with a movement. Nothing animates on the
  first load, and the set clears after the animation so an unrelated re-render
  does not replay it. Used by both `OrdersScreen` and the seats aside, where
  the animation had been hardcoded onto whichever order happened to be first.
- Seat grid tracks narrowed to 176px so a wide screen holds more tables.
- **Counter header on a phone: three rows → two** (170px → 109px of a 780px
  screen). The name and the controls share the first row; the tabs get their
  own and scroll sideways instead of wrapping. This was the item left open at
  the end of Phase 3.

The filters were already a `SegmentedControl` — that line in the original plan
was wrong.

Verified at 1440 and 390 with two real orders on the screen. API calls:
`/counter` asks for orders + tables, `/counter/orders` asks for orders only.

### Speed, after Phase 4  ☑ done

The Vercel region move is live — `x-vercel-id` now reads `bom1::bom1`. An API
call that needs the database went from **505ms to ~128ms**, and a single query
from ~200ms to ~20ms.

Two code fixes on top of it:

- **`useRealtime` fired `onReconnect` on the *first* subscription**, not only on
  a genuine reconnect. Every staff screen therefore asked for its data twice on
  every load — two `/api/reports/today` on the admin's landing page, two
  `/api/orders/live` on the counter's. Measured in a browser: now one.
- **`getCurrentStaff` read the staff, then the restaurant.** The cookie already
  names the restaurant and the staff query is scoped to it, so the two go in
  parallel now — one round trip less on every staff page *and* every API call.

Warm landing page after these: TTFB ~55ms, load ~290ms (was ~80ms TTFB with the
double fetch). The remaining wait staff notice is **cold start** — a Vercel
instance that has been idle pays for a new Node process plus `mongoose.connect`.
`maxPoolSize: 5` and `serverSelectionTimeoutMS: 8000` are set for that; the
bigger lever would be a non-SRV connection string, which skips two DNS lookups
on every cold connect, but that is an env change for the owner to make.

### Phase 5 — seat bill and kitchen  ☑ done

`SeatBillScreen` 361 → 230 lines, now the data and the decisions only:

| New file | Holds |
|---|---|
| `SeatOrderList` | the table's orders |
| `SettlePanel` | total, discount, paid-by, email, the settle button |
| `SeatBillOutcome` | the settled card and the free-seat card |

The settle call is untouched — still one conditional `findOneAndUpdate`, so two
people settling the same table at once still produce one bill.

Two bugs fixed on the way, both found by rendering the screen rather than
reading it:

- The orders list was a `<table>` with a 460px minimum, so every phone got a
  sideways scrollbar *inside* the card. It is a list now; the kitchen sits
  under the dish name instead of in its own column.
- The discount field was full width and pushed its label onto two lines.
  `TextField`'s base styles include `w-full`, and `className="w-[108px]"`
  cannot reliably beat it — two unprefixed width utilities on one element are
  settled by stylesheet order. It is sized by a wrapper now. (Third time this
  class-collision has bitten; it is in `CLAUDE.md`.)

`KitchenScreen`: warm `site-ink` header instead of `stone-900`, raw
`orange-*`/`red-*`/`stone-*` onto tokens, tickets 236px so a wall screen holds
more per row, and new tickets arrive with `useArrivals` — a cook is at the
pass, not watching the screen.

Verified at 1440 and 390. No duplicate API calls on either screen. The
occupied-table branch was checked by answering `/api/seats/{id}` with a
made-up table in Playwright — **nothing was written to the database**.

### Phase 6 — responsive and motion pass  ☑ done

All 23 screens — public, staff, guest-facing and HQ — swept at 390 / 834 /
1440 with `scripts/audit-screens.mjs`, which is kept for exactly this and
signs its own staff/HQ cookies so the screens behind a PIN are included.

Found and fixed:

| | |
|---|---|
| `/gu` was **12px wider than a 390px phone** | `Reveal from="left"` starts its content 28px outside the column, which widened the page until the animation finished. The site wrapper is `overflow-x-clip` now — `clip`, not `hidden`, because `hidden` creates a scroll container and silently breaks the sticky header. |
| Footer links were 21px tall | `py-2` → ~37px. They were under the 24px WCAG minimum, on every public page at every width. |
| The language chip was 34px | `py-2` → 37px. |
| `/tables` table name (opens the editor) was 24px | `py-1.5` → 36px. |

Motion was checked by loading the site with `prefers-reduced-motion: reduce`
and counting what still moves: **44 elements animated or offset normally, 2
with the preference on** — the top progress bar, which has to keep indicating
progress, and the honeypot, which is deliberately `opacity: 0`.

Three findings are expected and documented in the script's own header: the
honeypot, `/privacy`'s inline mailto (inline links are exempt from target
size), and `/today`'s bar-chart columns.

### Phase 7 — the guest screens, and the load they arrive with  ☑ done

The screens a guest meets after scanning a QR had been through none of the
passes above, and they are the ones loaded on someone else's phone, on mobile
data, once. Two halves: what they're built from, and what the browser has to
fetch before they appear.

**Built from the kit now, not from markup:**

| Was | Is |
|---|---|
| A hand-rolled search `<label>` with its own icon and no clear button | `SearchField` (its match count is announced, and the clear cross is a thumb-sized button) |
| A bestseller pill, a "cancelled" pill and the live dot, each with their own `orange-100`/`red-800`/`green-700` | `Badge` |
| Three notice boxes in `brand-light`/`orange-50`/dashed `amber-500` | `Alert` |
| The cart bar written inline in the menu screen | `GuestCartBar` — its own component, because a two-line button with a shadow is not something `Button` can be made to do from outside (`justify-center` on its base would fight a `justify-between` passed in) |
| `bg-stone-900` on the selected category chip | `bg-ink`, the same warm near-black the kitchen header moved to |
| `max-w-[480px]` repeated in five screens, and a cart footer `fixed` to the window and re-centred with a copy of that width | the width lives in the guest layout alone; the footer is `sticky bottom-0` inside the column |

**What a guest's phone downloads.** The root layout declared all four fonts,
so every page preloaded all four — including the website's display serif,
which only the website ever draws:

| Route | Fonts preloaded, before → after |
|---|---|
| `/t/{token}` (guest) | 334KB → **155KB** |
| `/r/{slug}/…` (staff) | 334KB → **155KB** |
| `/` and the English keyword pages | 334KB → **191KB** |
| `/gu` and its mirrors | 334KB → 306KB |

Three changes, all of them "declare the font where it is used":
`src/lib/fonts/sans.ts` (root layout) carries the body pair, `display.ts` is
imported by `(site)/layout.tsx` and `displayGujarati.ts` by a new
`(site)/gu/layout.tsx` — a `display: contents` wrapper, so it hands the custom
property down without becoming a box the pages below would have to lay
themselves out against. Noto Sans Gujarati also dropped its Latin subset
(30KB): Latin never reaches that family, Schibsted Grotesk is ahead of it in
every stack.

**This nearly shipped with every website heading in the body sans.** Caught by
reading the computed style in a browser rather than the diff: `.heading` was
`font-family: var(--font-display-latin), var(--font-display-gujarati), …`,
and on an English page the Gujarati variable is now simply not set. A bare
`var()` with nothing set is invalid *at computed-value time* — the browser
does not skip that one entry, it throws out the whole declaration and the
element inherits. Both vars carry a fallback now.

**And the service worker.** It was registered in the root layout, so a guest
who scans one QR, and every visitor reading the website, installed an offline
shell for an app they will never open — against what `(site)/layout.tsx`'s own
comment said it did. It is registered in `r/[slug]/layout.tsx` now: the staff
app is the thing that gets installed.

**Server side**, on the one screen a guest waits for:

- `resolveSeat` is `cache()`d. The guest page resolved the same token twice —
  once in `generateMetadata` for the tab title, once to render — which was two
  round trips (seat + table) spent on nothing.
- `getGuestState` costs two round trips instead of four. The orders, the
  "your bill is settled" card and the verified-email check used to run one
  after the other; they go out together now, and the email check skips Mongo
  entirely when the QR is ours — an OPEN sitting of this device is exactly
  what it was about to ask for, and `session` already proves it. This is the
  call a phone repeats every 10 seconds while Pusher has no keys.
- `loadMenuTree` and `getCounterOrders` `.select()` only what their DTOs
  carry. The order field list lives next to `serializeOrder`, which is what
  decides it. (Both were carried-over items from Phase 2 and the list above.)
- The other carried-over item, the `useCounterData({...})` call sites: there
  are two, `{ tables: true }` on the seat grid and no options at all on
  `/counter/orders`. Nothing asks for the menu. Nothing to fix.

Verified in a real browser at 375 and 1440: `/` loads Fraunces and no Gujarati
serif, `/gu` loads both, `/t/{dead token}` loads two fonts and registers no
worker, and neither page scrolls sideways. `npx tsc --noEmit`, `npx eslint
src`, `npm test` and `npm run build` are clean.

**Not verified here:** the guest screens with real data. They need a seat
token from a database, and this session had no throwaway one to read — run
`node scripts/audit-screens.mjs`, which now picks a free QR itself and sweeps
`/t/{token}` plus its `?v=cart`, `?v=verify` and `?v=status` steps at 390 /
834 / 1440.

### Phase 8 — the first screen after the PIN  ☑ done

Staff said the app felt slowest exactly where it is least forgivable: typing
the PIN and waiting for the screen behind it. What they were waiting for was
three round trips, not one — the page, and then the screen's own two API calls
for the data the page had just been to the database for anyway.

Every screen a login lands on now renders with its data in it:

| Screen | Calls on open, before → after |
|---|---|
| `/counter` (counter's landing) | page + `/api/orders/live` + `/api/tables` → **page** |
| `/kitchen` (kitchen's landing) | page + `/api/orders/pending` + `/api/menu` → **page + `/api/menu`** (the sold-out list is beside the tickets, not in front of them) |
| `/today` (admin's landing) | page + `/api/reports/today` → **page** |
| `/counter/orders` | page + `/api/orders/live` → **page** |

The hooks take an `initial` and skip only their *first* fetch; realtime,
polling and a language change all still reload as before. The chime's "seen"
set is seeded from that first copy too, or the first refresh would have rung
for every ticket already on the screen.

Two more on the way in:

- The login screen read **every** category and menu of the restaurant to put
  a station name under the kitchen logins. It reads only the categories those
  logins actually point at, and only when one of them is a kitchen.
- `getKitchenTickets`, `loadSeatDetail` and the login's own staff lookup
  `.select()` their fields now, like `getCounterOrders` does.

**Not changed, deliberately:** the login still finishes with
`window.location.assign`, a full document load. A client navigation would
save re-parsing the bundle, but the cookie was just set by a route handler
and the comment on that line says a full load is what makes the proxy and
every page see it — not something to change without being able to log in and
watch it work.

### Phase 9 — anything after this  ▢ not started

Candidates, in rough order of value:

- A non-SRV MongoDB connection string would cut two DNS lookups from every
  cold connect — the biggest remaining win on post-PIN speed, and an env
  change the owner has to make.
- Dish photos are one 480×400 file each, shown in a 96×80 box: a menu of 30
  dishes is over a megabyte on a guest's phone (lazily, and cached for a
  year). A second browser-made thumbnail at upload time would cut that five-
  fold, at the cost of a field, a fallback for photos already uploaded, and
  twice the Blob writes — worth agreeing with the owner first (`DISH_PHOTOS.md`).
- `messages.ts` ships both languages and every area's keys to every client
  (~23KB gzipped). Splitting it by area would cut what a guest downloads,
  but the single typed dictionary is what makes a missing key a type error —
  don't trade that away cheaply.
- A GST report for the accountant: `Bill.taxAmount` is stored, nothing reads
  it yet, and "sales" in the reports is money collected (GST included).

---

## Decisions already made

- **Native `<select>` stays.** See the rules above.
- **`SwipeToSend` stays.** Sending an order is not undoable from the counter.
- **Settle stays a single conditional `findOneAndUpdate`.** Two people settling
  the same table at once must still produce one bill (409 for the loser).
- **No new realtime channels.** Pusher's free plan allows 100 connections.
