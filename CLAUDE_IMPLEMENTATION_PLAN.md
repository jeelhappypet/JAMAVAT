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
- Guest verifies email by OTP once per device (30 days). OTP and the
  thank-you email go through Gmail SMTP.
- QR orders wait for the counter to accept, then split item-wise to
  kitchens by category (admin maps categories → staff logins). An order is
  ready only when every kitchen has marked its part.
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
| 3 | Tables + seat QRs, guest QR menu, cart + cooking note, email OTP (Gmail SMTP), QR lock, counter accept/reject, live guest status | ⬜ |
| 4 | Seat settle (discount, payment mode), thank-you email, counter seat grid + ready-to-serve, admin "Today" report | ⬜ |
| 5 | Multi-restaurant (`restaurantId` everywhere, `/r/{slug}`), Jamavat SEO + inquiry site, HQ panel, per-restaurant PWA manifest | ⬜ |

## Known non-blocking items

- Pusher needs real keys to be exercised end-to-end; without them every
  screen falls back to 5s polling (verified). Once keys exist, check two
  devices: order on the counter → beep + ticket on the kitchen screen.
- Counter screens (new order, live orders) and Reports still have the v1
  look and hardcoded Gujarati — they're redesigned in Phases 3–4.
- No automated test suite yet. Highest-value first tests: order
  creation/idempotency, the complete/cancel race guard, and the auth
  rules (lockout, sessionVersion revocation, last-admin guard).
