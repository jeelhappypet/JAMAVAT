# જમાવટ

Restaurant order management PWA. Gujarati UI, staff PIN login, single
Next.js app for frontend + backend, MongoDB Atlas, Socket.IO realtime.

See [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) for the full
architecture and [CLAUDE_IMPLEMENTATION_PLAN.md](CLAUDE_IMPLEMENTATION_PLAN.md)
for what's done and what's left.

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI + ADMIN_SESSION_SECRET
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On a fresh database
you're sent to `/setup` to create the owner (admin) account — it asks for
the `SETUP_KEY` from `.env.local` (or the old `ADMIN_PASSWORD`). After that,
staff log in with their name + 4-digit PIN and stay logged in until they
log out; the admin adds staff from the **Staff** tile.
