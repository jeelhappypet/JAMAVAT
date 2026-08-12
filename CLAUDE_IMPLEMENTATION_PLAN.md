# CLAUDE_IMPLEMENTATION_PLAN.md

Status for future Claude sessions continuing this project. Read
[PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) first for the "why";
this file is the "what's done / what's left."

## Status: Phases 1–6 complete, Phase 7 (deploy) not started

| Phase | Scope | Status |
|---|---|---|
| 1 | Next.js scaffold, Tailwind, Gujarati font, PWA base, home screen | ✅ |
| 2 | MongoDB, Menu model + management, New Order UI | ✅ |
| 3 | Token generation, order creation, success popup, Live/Pending Order | ✅ |
| 4 | Socket.IO realtime, reconnect, resync | ✅ |
| 5 | Developer/admin auth + statistics | ✅ |
| 6 | Race-condition protection, error handling, responsive/PWA polish | ✅ |
| 7 | Vercel deployment, production env vars, MongoDB Atlas prod config | ⬜ not started |

Everything through Phase 6 was exercised against a running instance
(browser + direct API calls), not just written and assumed correct — see
PROJECT_ARCHITECTURE.md §12 for exactly what was checked.

## What's left (Phase 7)

1. Create the MongoDB Atlas cluster (or confirm one exists) and get the
   production connection string.
2. Create/confirm the Vercel project, link this repo.
3. Set production env vars in Vercel: `MONGODB_URI`, `ADMIN_USERNAME`,
   `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (generate a **new** one — don't
   reuse the local dev value), `NEXT_PUBLIC_APP_NAME`.
4. Deploy, then smoke-test on the real domain: home → new order → swipe →
   token popup; open live-order and pending-order on two devices and
   confirm realtime; log into `/developer`.
5. Specifically verify realtime behavior on Vercel's actual runtime (see
   PROJECT_ARCHITECTURE.md §14) — confirm sockets connect, and separately
   confirm the app is still correct if they don't (kill the socket
   connection in devtools and check that polling/resync still shows
   correct state within ~20s).
6. Drop in the real jamavat logo (`public/brand/logo.png` + regenerate
   `public/icons/*`) once supplied — current assets are placeholders (see
   PROJECT_ARCHITECTURE.md §9).
7. Replace the 3 sample menu items with the real opening menu via `/menu`.

## Known non-blocking items

- The realtime transport is WebSocket-only by design (see
  PROJECT_ARCHITECTURE.md §7) — this was a deliberate fix for a fragility
  found in Socket.IO's HTTP long-polling handshake over the Pages Router
  API route in this dev setup, not an untested guess. If a future session
  changes the socket transport config, re-verify with two real concurrent
  clients (two devices or two separate browser profiles — not two tabs in
  one profile, which share a connection pool and can mask multi-client
  issues) before trusting it.
- No automated test suite was added (none existed before, and the brief
  doesn't call for one) — verification so far is manual/scripted-in-session
  per §12. If ongoing regressions become a problem, adding a handful of
  route-handler tests around order creation/idempotency and the
  complete/cancel race guard would be the highest-value place to start.

## Extension points (do not build until requested)

Multiple counters/kitchens, table orders, billing/printing, inventory,
staff accounts, advanced reports, customer history. The data model
(snapshotted order items, server-controlled status, business-date-scoped
tokens) was kept simple enough that these can be layered on later without
reworking the order core.
