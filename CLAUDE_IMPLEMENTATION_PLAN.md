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
| 5 | Multi-restaurant (`restaurantId` everywhere, `/r/{slug}`), Jamavat SEO + inquiry site, HQ panel, per-restaurant PWA manifest | ⬜ |

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
- Privacy policy page (linked from the guest Verify screen in the design)
  is not built yet.
- Vercel Hobby is non-commercial; move to Pro before selling Jamavat.
- Free-plan headroom: Gmail sends ~500 mails/day (2,000 on Google
  Workspace) and a sitting uses at most 2 (OTP + thank-you); Pusher free
  allows 100 connections / 200k messages a day; Blob free is 1 GB storage
  and 10 GB transfer a month (`DISH_PHOTOS.md`).
