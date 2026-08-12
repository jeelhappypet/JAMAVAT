# જમાવટ

Restaurant order management PWA. Gujarati UI, no public login, single
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

Open [http://localhost:3000](http://localhost:3000) — home has no login.
Admin stats are at `/developer` (default local credentials:
`jamavat` / `jamavat`, see `.env.local`).
