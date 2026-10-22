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

### Phase 5 — seat bill and kitchen  ◀ **next**

- `SeatBillScreen` (361 lines, the biggest) split up; settle flow unchanged —
  it is a conditional `findOneAndUpdate` and must stay one.
- `KitchenScreen`: ticket arrival animation, column layout at 1440.

### Phase 6 — responsive and motion pass  ▢ not started

Every screen at 390 / 834 / 1440, then the motion rules from `CLAUDE.md`.

---

## Decisions already made

- **Native `<select>` stays.** See the rules above.
- **`SwipeToSend` stays.** Sending an order is not undoable from the counter.
- **Settle stays a single conditional `findOneAndUpdate`.** Two people settling
  the same table at once must still produce one bill (409 for the loser).
- **No new realtime channels.** Pusher's free plan allows 100 connections.
