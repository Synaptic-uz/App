# Synaptic AI

Conversational ad platform for the Uzbekistan market — AI chat matching, campaign management, wallet billing, and agent API integration.

## Monorepo layout

| Path | Stack | Docs |
|------|-------|------|
| [`backend/`](backend/) | Python, FastAPI, MongoDB | [backend/README.md](backend/README.md) |
| [`dashboard/`](dashboard/) | React, Vite, TypeScript | [dashboard/README.md](dashboard/README.md) |
| [`old_backend/`](old_backend/) | Legacy Node.js/Express | Deprecated |

## Quick start (dev)

```bash
# 0. Vector DB
docker compose up -d qdrant

# 1. Backend
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && cp .env.example .env
PYTHONPATH=. uvicorn app.main:app --port 3007

# 2. Frontend (new terminal)
cd dashboard && npm install && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) · API [http://localhost:3007/docs](http://localhost:3007/docs)
