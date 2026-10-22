@AGENTS.md

# Jamavat — project rules

Read PROJECT_ARCHITECTURE.md (the why) and CLAUDE_IMPLEMENTATION_PLAN.md (what's done / left) first.
Every screen must match the design canvas: https://claude.ai/artifact/Dy69AoyjoUUj5oiu3261aJ

## UI components — always use `src/components/ui/`

Never hand-style a button, checkbox, dropdown, text field, date field or dialog inside a screen. Use:

| Need | Component |
|---|---|
| Any button or button-styled link | `Button` (`variant`: primary · secondary · outline · danger · dangerSolid · success · successSoft · dark · outlineDark · ghost · link; `size`: inline · sm · md · lg · xl; `href` makes it a link) |
| Icon-only button / download link | `IconButton` (`label` is required — it's the aria-label and tooltip) |
| Checkbox (with or without label) | `Checkbox` (`onChange(checked)`) |
| Radio choice as big cards ("Paid by") | `ChoiceCards` |
| Dropdown | `Select` (native `<select>`, `onChange(value)`) |
| Text / number / email / tel / url / PIN input | `TextField` (`label`, `hint`, `size`) |
| Multi-line text | `TextArea` |
| Date | `DateInput` (native calendar, value `YYYY-MM-DD`) · month: `MonthPicker` |
| Grey track with a white selected pill (filters, ranges, menu tabs, Veg/Non-veg) | `SegmentedControl` |
| − 2 + quantity | `QuantityStepper` |
| Dialog | `Modal` · confirmation: `ConfirmDialog` · sidebar on desktop / bottom sheet on mobile (an activity feed, anything too long for a centered dialog): `SidePanel` |
| Error / success / info box | `Alert` |
| Small status pill | `Badge` |
| Panel | `Card` · empty list: `EmptyState` |
| Loading | `Skeleton` blocks in the screen's shape: `SkeletonCards` (tickets / tables), `SkeletonList`, `SkeletonDishes`, `SkeletonReport` — not a spinner. Taps that fetch or navigate already show `TopProgress` (root layout); don't add per-screen spinners for them |
| Dish photo | `components/menu/DishPhoto` (6:5 box; upload goes through `DishPhotoField`, see `DISH_PHOTOS.md`) |

Everything clickable gets the hand cursor from `globals.css` — don't add `cursor-pointer` per screen.

Two display utilities on one element (`hidden` plus the `inline-flex` `buttonClass` already sets) are settled by stylesheet order, not by which you wrote last. Wrap the element instead.

## Website typography and motion (`src/app/(site)` only)

One scale, defined in `globals.css` — never a fresh `clamp()` in a screen:

| Need | Class |
|---|---|
| Any website heading | `heading` (Fraunces / Noto Serif Gujarati) plus a size below |
| Page h1 | `t-hero` · section h2: `t-h2` · card h3: `t-h3` |
| The paragraph under a title | `t-lead` · body: `t-body` · fine print: `t-small` |
| The label above a title | `t-eyebrow` |

Body text and the whole staff app stay on the sans (Schibsted Grotesk / Noto Sans Gujarati); `heading` is the website's voice only — a serif on a counter screen is decoration in someone's way.

Motion: `animate-fade-up` / `animate-art-in` for a load-in, `<Reveal from="up|left|right|scale|wipe">` for a scroll-in, `site-lift` for a card, `site-cta` + `<Arrow />` for a button. One easing (`--ease-out-soft`) and two durations. Everything is already in the HTML — motion only animates its entrance — and every rule has a `prefers-reduced-motion` reset.

## Website analytics

Views and button presses go to HQ's Website tab. Count a new button by giving it `data-track="…"` and adding that key to `TRACKED_LABELS` in `lib/site/statLabels.ts`; a new page needs its path in `TRACKED_PATHS`. Anything not on those lists is dropped — the write endpoint is public. Counters only: no address, no cookie, nothing that identifies a visitor.

`className` on these is for layout only (width, flex, margin). If a screen needs a new look, add a variant to the component — don't override colours from outside. Join classes with `cn()`.

## API and data

- Load only what the screen shows. One screen = the fewest calls; never fetch a whole tree (menu, tables) for one label — add the field to the API that's already called (see `SeatDetailDTO.kitchens`).
- Realtime (Pusher) is a nudge, MongoDB is the truth. An event reloads only what it can change (`useCounterData` handlers). Heavy screens (reports) throttle reloads (`useThrottled`). Polling is only the fallback (`lib/realtime/polling.ts`) and always goes through `usePeriodicRefresh`, which pauses while the page is off screen — never write a bare `setInterval(fetch…)`.
- Don't put a screen's data on a timer when an event or the guest's own next tap can fetch it (the guest menu refetches when it's stale and the phone comes back, not every two minutes).
- Guests get pushes on the public per-QR channel (`notifyGuestSeat`) — never put data in those messages. A guest phone connects only during its own sitting while on screen (`useGuestRealtime(…, enabled)`) — keep it that way, the Pusher free plan has 100 connections.
- Images are resized in the browser before upload (`lib/utils/dishPhoto.ts`); don't add server-side image processing or Next's image optimizer for them.
- Every state change is a conditional `findOneAndUpdate` on the status it starts from (409 if someone else won). Await `emitRealtimeEvent` / `notifyGuestSeat` after the DB write.
- Queries that run often need an index (check the model's `schema.index`). Read with `.lean()` and `.select()` only the fields you use.
- Route handlers: `requireStaff(roles)` first, `respond(t, failKey, …)` for errors, zod schemas in `lib/validation/`, messages through `t()` — no hardcoded text.
- Shared shapes live in `src/types/index.ts` (DTOs); models in `src/models/`.

## Text

Every visible string is an i18n key in `src/lib/i18n/messages.ts` with English and ગુજરાતી (a missing key is a type error). Times: `formatClock()`. Money: `₹` + `toLocaleString("en-IN")`.

## Before you finish

`npx tsc --noEmit`, `npx eslint src`, `npm test` (vitest, `tests/`), `npm run build`. Test against an isolated database, never the owner's (`jamavat_dev` is theirs, `JAMAVATDATA` is live).
