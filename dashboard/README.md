# Synaptic Dashboard

React + Vite frontend for **Synaptic AI** — business and agent portals, campaign editor, wallet, analytics, and an AI chat demo with sponsored matching.

Talks to the FastAPI backend on port **3007** (via dev proxy or same-origin in production).

## Requirements

- Node.js 20+
- npm (or pnpm/yarn)
- Running [backend](../backend/README.md) on `http://localhost:3007`
- MongoDB populated (same database the backend uses)

## Quick start

```bash
# Terminal 1 — backend
cd ../backend
source .venv/bin/activate
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 3007

# Terminal 2 — dashboard
cd dashboard
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) (Vite default port).

API calls go to `/api/...` on the dev server; Vite proxies them to `:3007` (see `vite.config.ts`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with HMR + API proxy |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build (proxy to `:3007`) |

## Environment variables

Copy `.env.example` to `.env` only when you need overrides.

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | REST API base path |
| `VITE_AUTH_URL` | `/authorized` | Agent B2B endpoint base |
| `VITE_TRACKING_URL` | same origin | Click tracking base (for `/t/...` links) |
| `VITE_DEMO_API_KEY` | auto demo key | API key for chat demo agent calls |

**Local dev:** leave variables unset — relative paths + Vite proxy are enough.

**Production on a separate API host:**

```env
VITE_API_URL=https://api.example.com/api
VITE_AUTH_URL=https://api.example.com/authorized
VITE_TRACKING_URL=https://api.example.com
```

**Production same-origin:** build the dashboard and let FastAPI serve `dist/` (no `VITE_*` needed).

## Project structure

```
dashboard/
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── App.tsx, routes.tsx, Layout.tsx
│   │   ├── pages/           # Login, Campaigns, Dashboard, ChatDemo, …
│   │   ├── components/      # UI, campaign form, analytics charts
│   │   └── context/         # AuthContext
│   └── lib/
│       ├── api.ts           # All backend calls + JWT refresh
│       ├── tracking.ts
│       └── campaignFormUtils.ts
├── vite.config.ts           # Proxy → localhost:3007
├── index.html
└── dist/                    # Built assets (served by backend in prod)
```

## Main features

| Role | Pages |
|------|-------|
| **Business** | Campaigns, wallet, analytics, AI campaign research, profile |
| **Agent** | Agent registration, API keys, per-agent stats |
| **Public** | Landing, chat demo (`/api/enrich`) |

Auth tokens are stored in `localStorage` (`token`, `refreshToken`, `user`). The client auto-refreshes expired access tokens via `/api/auth/refresh`.

## API client

All HTTP logic is in `src/lib/api.ts`:

- `api.login`, `api.register`, `api.me`, …
- `api.getCampaigns`, `api.enrich`, `api.sendResult`, …
- `authFetch()` — attaches JWT and retries once after refresh

If the backend is down, you'll see: *Serverga ulanib bo‘lmadi. FastAPI (port 3007) ishlayotganini tekshiring.*

## Build for production

```bash
npm run build
```

Output: `dashboard/dist/`. Start the backend from the repo root context — it auto-serves the SPA when `dist/index.html` exists.

Alternatively deploy `dist/` to any static host and point `VITE_*` URLs at your API.

## Tech stack

- React 18, React Router 7
- Vite 6, Tailwind CSS 4
- Radix UI, Recharts, react-markdown
- TypeScript
