# Synaptic System Design

## 1. Overview

Synaptic is a conversational ad platform for the Uzbekistan market. The product connects:

- business users who create campaigns and fund them from a wallet
- AI agents / publishers who integrate the agent API
- end users who chat with an AI assistant and receive native, context-aware ad suggestions

The current system is implemented as a monorepo with:

- `dashboard/`: React + Vite + TypeScript frontend
- `backend/`: FastAPI backend
- `MongoDB`: source of truth for users, campaigns, wallets, agents, sessions, analytics
- `Qdrant`: vector database for campaign embeddings and similarity search
- GitHub Models / OpenAI-compatible inference: embeddings, research, enrichment

The local Qdrant service is currently available at `http://localhost:6333`.

## 2. Design Goals

- Keep ad matching contextual instead of banner-based
- Make campaign creation fast with AI-assisted autofill
- Provide a clean separation between source-of-truth storage and vector search
- Support both business and agent workflows with one backend
- Keep the UI translation-driven and easy to localize
- Keep the landing page lightweight enough to protect FCP/LCP/TBT
- Keep the system easy to run locally and deploy as a single origin

## 3. High-Level Architecture

```
Browser
  |
  |  Vite dev proxy in development
  v
Dashboard (React/Vite)
  |
  |  /api, /authorized, /t
  v
FastAPI backend (:3007)
  |
  +--> MongoDB (users, campaigns, sessions, wallet, analytics, agents)
  +--> Qdrant (:6333) (campaign embeddings and semantic search)
  +--> GitHub Models / LLM endpoints (research, embeddings, chat)
```

The backend can also serve the built dashboard in production from the same origin.

## 4. Frontend

### 4.1 Main responsibilities

- Authentication UI
- Campaign CRUD
- Wallet and balance management
- Agent registration and analytics
- Business analytics
- Demo chat / conversational ad preview

### 4.2 Frontend data access

The dashboard calls the backend through a shared API client in `dashboard/src/lib/api.ts`.

Important properties:

- `VITE_API_URL` defaults to `/api`
- Vite proxies `/api`, `/authorized`, and `/t` to the backend in development
- Auth headers are attached automatically when a token exists
- API errors are normalized into translated messages when possible

### 4.3 Route model

The app uses React Router with protected routes by role:

- `business` routes for campaign and business analytics
- `agent` routes for agent management and agent analytics
- public routes for login, register, and demo chat

### 4.4 i18n and performance

- All visible UI copy is routed through `dashboard/src/i18n/*.json`
- The landing page keeps the hero in the initial chunk and lazy-loads lower sections after idle time
- The demo page reuses `chat.*` translation keys for title, prompts, helper text, and toasts
- Sponsored ad cards use localized labels instead of hardcoded strings

## 5. Backend

### 5.1 Backend responsibilities

- Authentication and session lifecycle
- Campaign CRUD and AI research
- Wallet allocation and deposits
- Agent registration and stats
- Analytics and tracking
- Conversational matching
- Embedding generation and vector search

### 5.2 Main API groups

| Area | Prefix | Notes |
|---|---|---|
| Auth | `/api/auth/*` | register, login, refresh, sessions, profile |
| Wallet | `/api/wallet/*` | business wallet and transactions |
| Campaigns | `/api/campaigns/*` | CRUD, AI research, embedding refresh |
| Agents | `/api/agents/*` | agent registry and dashboard stats |
| Chat / Enrich | `/api/enrich` | public demo chat endpoint |
| Analytics | `/api/analytics`, `/api/dashboard/:id` | campaign and agent analytics |
| Tracking | `/api/t/:code` | click tracking and redirect |
| Health / Ops | `/api/health`, `/api/cache/clear` | diagnostics and cache rebuild |

The public demo flow is intentionally separate from authenticated business flows so it can be embedded and tested without a logged-in session.

## 6. Authentication and Sessions

### 6.1 Token model

Synaptic uses:

- access token for API calls
- refresh token for session renewal
- optional session id for server-side session tracking

### 6.2 Session flow

1. User logs in or registers.
2. Backend issues access and refresh tokens.
3. Frontend stores them locally and uses access token for requests.
4. If the access token expires, frontend refreshes once.
5. If refresh fails, the session is cleared and the user is sent to login.

The client avoids duplicate refresh attempts during bootstrap. If the profile request already triggered a refresh and still fails, the session is cleared instead of retrying a second time.

### 6.3 Roles

- `business`: can manage campaigns, wallet, and business analytics
- `agent`: can register agents, view agent analytics, and use agent workflow

## 7. Campaign Lifecycle

### 7.1 Creation

Campaign form data includes:

- `name`
- `category`
- `subcategory`
- `custom_category`
- `brand_url`
- `link_text`
- `tagline`
- `description`
- `keywords`
- `niche_keywords`
- `budget`
- `cpc_rate`
- `tone`
- `research_brief`
- `offerings[]`

### 7.2 AI research autofill

The frontend can call the research endpoint with a brand URL and optional context.

The backend returns enriched campaign fields by:

- fetching or analyzing the brand source
- proposing campaign copy
- generating or updating offerings
- preparing a profile text for embeddings and matching

### 7.3 Embedding generation

Campaigns have a text profile built from structured fields.

That profile is used for:

- embedding generation
- semantic search
- campaign matching against user prompts

### 7.4 CRUD side effects

Campaign create/update/delete/status changes trigger:

- MongoDB persistence
- cache refresh
- Qdrant upsert or delete
- analytics / ranking recalculation where applicable

### 7.5 Offerings and matching profile

Campaigns can also include a product or service offering list.

That content is used for:

- more specific ad copy generation
- richer embeddings for matching
- admin-facing campaign profile previews

## 8. Matching and Serving

### 8.1 Matching pipeline

The serving flow for chat or agent requests is:

1. Normalize prompt and recent chat history.
2. Detect intent or urgency if needed.
3. Find candidate campaigns using keyword and vector similarity.
4. Rank candidates using business rules and scoring.
5. Return a native suggestion or sponsored response.
6. Log impression and later click/conversion events.

### 8.2 Data used for ranking

- campaign category and keywords
- campaign embedding similarity
- bid / CPC
- recent exposure constraints
- active status
- performance and CTR-related signals

### 8.3 Demo chat serving path

The public `/demo` page uses the same matching concepts as the agent-serving path, but with a friendlier chat UI:

- user message goes to AI enrichment
- the backend can optionally return a sponsored suggestion
- the frontend renders the assistant response and a native ad card when there is a valid match

## 9. Qdrant Vector Search

Qdrant is the vector index for campaigns.

Current design:

- MongoDB is the source of truth
- Qdrant stores campaign embeddings for fast search
- the backend keeps Qdrant in sync from campaign lifecycle events

Operational notes:

- local Qdrant runs on `http://localhost:6333`
- startup can sync all active campaigns into Qdrant
- `VECTOR_DB_ENABLED=0` disables Qdrant and falls back to in-memory cosine scan
- live sync verification is still treated as a TODO while the integration is being hardened

### 9.1 Why Qdrant exists

- faster candidate search than scanning all campaigns
- better semantic relevance for chat prompts
- scalable separation between transactional data and search index

## 10. Wallet and Billing

Businesses fund campaigns from a wallet.

Design rules:

- wallet balance is tracked in MongoDB
- campaign budgets are allocated from the wallet
- campaign spending is deducted as clicks or serves are recorded
- low funds or depleted budgets can pause serving logic

The wallet flow is intentionally separate from campaign data so billing and ad serving can evolve independently.

## 11. Agent Model

Agents are external integrations that consume the ad serving API.

Two main paths exist:

- dashboard-side agent management under `/api/agents/*`
- B2B serving path under `/authorized/send_result`

Agent workflow:

1. Business or operator registers an agent record.
2. API key is generated and stored as a hash server-side.
3. The agent calls the send-result endpoint with the key.
4. The backend returns either a matched campaign or no-match response.
5. Impressions and clicks are tracked for analytics and revenue sharing.

### 11.1 Agent analytics routes

The dashboard exposes two agent analytics views:

- `/agent/analytics` shows the agents list
- `/agent/:agent_code/analytics` shows one agent’s analytics detail

The `agent_code` is resolved from the backend agent identifier, so analytics links can be generated directly from the manage page and list view.

## 12. Analytics

Analytics are split into two levels:

- business analytics: campaign performance, spend, CTR, funnel
- agent analytics: requests, impressions, clicks, revenue

The backend derives analytics from:

- event logs
- campaign state
- wallet transactions
- agent serving records

The frontend also exposes a dedicated agent manage page with direct links into agent analytics, so operators can move from registry to performance view in one step.

## 13. Tracking and Conversion

Tracking links are generated by the backend and routed through `/api/t/:code`.

This endpoint handles:

- click logging
- campaign attribution
- redirect to the final destination

Conversion events are stored separately so the system can compare:

- impressions
- clicks
- conversions
- revenue

## 14. Data Storage Model

### 14.1 MongoDB collections

Typical collections include:

- `users`
- `sessions`
- `campaigns`
- `agents`
- `wallets`
- `wallet_transactions`
- `events`

### 14.2 Qdrant collection

- collection name: `synaptic_campaigns`
- points represent active campaign embeddings
- payload stores campaign metadata used during retrieval

## 15. Observability

### 15.1 Backend logging

The backend emits:

- request timing logs
- vector search timing logs
- cache and sync logs
- error logs

The API response envelope is intentionally consistent:

- `status`
- `status_code`
- `message`
- `data`

That makes client-side translation and error handling predictable.

### 15.2 Health checks

Health endpoints report:

- MongoDB connectivity
- Qdrant connectivity
- vector search state
- cache state

## 16. Deployment Model

### 16.1 Development

- frontend: Vite on `:5173`
- backend: FastAPI on `:3007`
- Qdrant: `:6333`
- Vite proxies backend routes during local development

### 16.2 Production

Recommended production shape:

- build the dashboard into `dashboard/dist`
- serve the SPA and API from FastAPI on one origin
- point `PUBLIC_URL` at the public API origin for tracking links
- keep MongoDB and Qdrant managed externally or containerized
- keep landing and demo routes cache-friendly where possible

## 17. Error Handling Strategy

- API responses use a consistent `status / status_code / message / data` envelope
- frontend translates known `status_code` values when possible
- auth failures clear the client session
- 404 route mismatches are treated as integration issues, not user errors

## 18. Extensibility

The current design leaves room for:

- richer recommendation scoring
- multi-language content generation
- more advanced wallet allocation rules
- additional agent channels
- campaign experimentation and A/B tests
- improved vector search reranking
- higher-level dashboard personalization
- better chunk splitting for heavy UI routes

## 19. Current TODOs

- Tighten the VectorDB/Qdrant production rollout with live sync and search verification
- Add more detailed agent analytics drill-downs
- Expand campaign research feedback during autofill
- Continue moving any new hardcoded UI copy into translations as screens are added

## 20. Summary

Synaptic is built around a simple separation:

- transactional truth lives in MongoDB
- semantic retrieval lives in Qdrant
- AI inference powers campaign research and response generation
- the dashboard stays thin and talks to a single backend API

That structure keeps the product adaptable while supporting the current business and agent workflows.
