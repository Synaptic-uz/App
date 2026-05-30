# Synaptic Backend

FastAPI server for **Synaptic AI** — conversational ad matching, campaign management, wallet/billing, agent API, and LLM enrichment. Uses MongoDB and GitHub Models for embeddings and chat.

Default port: **3007**

## Requirements

- Python 3.12+
- MongoDB (local or Atlas)
- [GitHub Models token](https://github.com/settings/tokens) with inference access (optional but required for AI features)

## Quick start

```bash
# Vector DB (Qdrant)
docker compose up -d qdrant

cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # fill MONGODB_URI, JWT_SECRET, GITHUB_TOKEN
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 3007 --reload
```

Health check: [http://localhost:3007/api/health](http://localhost:3007/api/health)

Interactive API docs: [http://localhost:3007/docs](http://localhost:3007/docs)

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3007` | HTTP port |
| `MONGODB_URI` | `mongodb://localhost:27017/synaptic-ai` | MongoDB connection string |
| `JWT_SECRET` | — | **Required in production.** Signs access/refresh tokens |
| `JWT_ACCESS_EXPIRES` | `1h` | Access token TTL |
| `JWT_REFRESH_EXPIRES` | `7d` | Refresh token / session TTL |
| `GITHUB_TOKEN` | — | GitHub Models API (embeddings, enrich, campaign research) |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model id |
| `EMBEDDING_TIMEOUT_MS` | `25000` | Embedding request timeout |
| `INITIAL_WALLET_BALANCE` | `0` | Wallet seed for new business accounts |
| `ALLOW_MOCK_DEPOSIT` | `0` | Set to `1` to enable test wallet deposits |
| `AGENT_REVENUE_SHARE` | `0.7` | Agent revenue share on tracked clicks |
| `PUBLIC_URL` | — | Public base URL for tracking links (e.g. `https://api.example.com`) |
| `AD_WEIGHT_*`, `AD_TOP_K`, … | see `.env.example` | Hybrid ad ranking weights |
| `VECTOR_DB_ENABLED` | `1` | Enable Qdrant vector search |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant HTTP API |
| `QDRANT_COLLECTION` | `synaptic_campaigns` | Collection name |
| `VECTOR_SEARCH_TOP_K` | `20` | Top-K neighbors per query |
| `VECTOR_SCORE_THRESHOLD` | `0.15` | Minimum cosine score |

## Vector DB (Qdrant)

Campaign embeddings are stored in **MongoDB** (source of truth) and indexed in **Qdrant** for fast similarity search.

```bash
docker compose up -d qdrant   # from repo root
```

- **Startup** — syncs all active campaigns with embeddings into Qdrant
- **CRUD** — create / update / refresh-embedding / delete / status change auto-sync
- **Matching** — Qdrant top-K + keyword hybrid (see `[perf] vectordb.search` logs)
- **Health** — `GET /api/health` → `vectordb.connected`, `vectordb.points`
- **Reindex** — `POST /api/cache/clear` rebuilds cache + vector index

Disable without removing code: `VECTOR_DB_ENABLED=0` (falls back to in-memory cosine scan).

## Project structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, static dashboard fallback
│   ├── config.py            # Settings from .env
│   ├── api/routes/          # HTTP handlers
│   │   ├── auth.py          # Register, login, sessions, profile
│   │   ├── wallet.py        # Business wallet
│   │   ├── campaigns.py     # Campaign CRUD + AI research
│   │   ├── agents.py        # Agent keys + /authorized/send_result
│   │   ├── enrich.py        # Chat enrichment (/api/enrich)
│   │   ├── analytics.py     # Stats, tracking, conversions
│   │   ├── match.py         # Internal AI match endpoint
│   │   └── misc.py          # Health, cache clear
│   ├── services/            # Business logic
│   │   ├── embeddings.py    # GitHub Models embeddings
│   │   ├── vector_store.py  # Qdrant upsert / search / sync
│   │   ├── matcher.py       # Keyword + vector hybrid matching
│   │   ├── ranking.py       # Bid / CTR / relevance ranking
│   │   ├── enrichment.py    # LLM intent + response generation
│   │   └── wallet.py        # Wallet transactions
│   ├── core/                # Auth, JWT, sessions, deps
│   ├── db/                  # Motor (MongoDB) + Qdrant client
│   └── middleware/          # Request timing logs ([perf])
├── requirements.txt
└── .env.example
```

## API overview

| Area | Prefix | Auth |
|------|--------|------|
| Auth | `/api/auth/*` | JWT (except register/login/refresh) |
| Wallet | `/api/wallet/*` | JWT, business role |
| Campaigns | `/api/campaigns/*` | JWT |
| Agents (dashboard) | `/api/agents/*` | JWT |
| Agent B2B | `/authorized/send_result` | API key (`api_key` body or `X-Synaptic-Key`) |
| Chat / demo | `/api/enrich` | Public |
| Analytics | `/api/analytics`, `/api/dashboard/:id` | Mixed |
| Tracking | `/t/:code` | Public (302 redirect) |
| Health | `/api/health` | Public |

## AI matching pipeline

1. **Prompt** — user message (+ optional chat history) is normalized.
2. **Intent** — rule-based keywords, then LLM fallback (hot / warm / cold).
3. **Match** — keyword hits + embedding cosine similarity against active campaigns.
4. **Rank** — hybrid score: bid, relevance, CTR, controlled randomness.
5. **Serve** — impression logged; agent/chat response or sponsored suggestion returned.

Performance logs appear in the terminal with the `[perf]` prefix (e.g. `embed.api`, `match.scan`, `HTTP POST …`).

## Production (single origin)

Build the dashboard, then serve everything from FastAPI:

```bash
cd ../dashboard && npm run build
cd ../backend
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 3007
```

If `dashboard/dist/index.html` exists, the backend serves the SPA and API on the same port.

## Development with the dashboard

Run the backend on `:3007`, then start the Vite dev server (see [dashboard/README.md](../dashboard/README.md)). Vite proxies `/api`, `/authorized`, and `/t` to the backend.

## Legacy Node backend

The previous Express server lives in `../old_backend/` and is no longer used by the dashboard.
