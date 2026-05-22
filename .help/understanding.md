# Synaptic AI (SI) — My Understanding of the Project

> Written after reading every file in the codebase. This is what I understand so far.

---

## The Big Picture — What Synaptic AI Actually Is

Synaptic AI is an **intent-based conversational commerce platform** — essentially an **ad network for AI agents**.

The core idea:

```
End User  →  talks to some AI Agent (Telegram bot, chatbot, etc.)
                    ↓
              That AI Agent calls YOUR API silently in the background
                    ↓
              Your system analyzes the user's message (prompt)
                    ↓
              If the user has purchase intent → match them to a relevant
              product/campaign from your client database
                    ↓
              Return a "soft suggestion" + tracking link back to the AI Agent
                    ↓
              The AI Agent appends it to their own response
                    ↓
              User clicks → you track it → everyone earns
```

**You are NOT the AI agent.** You are the **middleware monetization layer** that sits between:
- **AI Agents** (your distribution partners — they bring the users)
- **Advertisers/Brands** (your clients — they pay to get their products recommended)

---

## The Two Sides of the Business

### Side A: Advertisers (Campaigns)
These are brands like Uzum Market, Olcha, ZoodMall, Yandex Eats, etc. They:
- Create campaigns in your system with a name, category, brand URL, keywords, description, tagline
- Pay per click (CPC model) and/or per conversion (CPA percentage)
- Set budgets and daily impression caps
- Get their products recommended when a user's intent matches

### Side B: AI Agent Partners
These are external AI products (bots, assistants, wrappers). They:
- Register via `POST /api/agents/register` → receive an API key (`sk-synaptic-...`)
- Call `POST /authorized/send_result` with the user's prompt + their API key
- Get back either `{ match: true, suggestion, tracking_url, ... }` or `{ match: false }`
- Earn commission on clicks that flow through their platform

---

## How the Money Flows

```
Brand creates campaign (budget: 1,000,000 UZS, CPC: 500 UZS)
     ↓
AI Agent sends user prompt → match found → impression logged
     ↓
User clicks tracking link (/t/{code}?a={agent_username})
     ↓
Click event logged with campaign_id + agent_id
     ↓
Campaign.spent += CPC rate
     ↓
Agent.total_clicks++ (revenue_earned calculation = future feature)
     ↓
User lands on brand_url (redirect)
     ↓
If user converts → POST /api/conversion → CPA earned
```

**Revenue model**: CPC (cost per click) + CPA (percentage of conversion value).

---

## The Two Main API Flows

### Flow 1: `/authorized/send_result` — The B2B Production Endpoint
This is the **core money-making endpoint**. External AI agents call this.

**How it works:**
1. **Auth**: API key validated via `agentAuth` middleware (SHA-256 hash lookup)
2. **Keyword matching**: Prompt scanned against campaign keywords
3. **Vector matching**: Prompt embedded via `text-embedding-3-small` (GitHub AI inference) → cosine similarity against campaign embeddings
4. **Best match selection**: Highest score above threshold (0.25) wins
5. **Response**: Template-based suggestion (NO LLM call — fast, ~200-400ms)
6. **Tracking**: Impression event logged, agent stats updated
7. **Fail-safe**: On ANY error or no-match → `{ match: false }` (never crashes the agent)

### Flow 2: `/api/enrich` — The Internal/Demo Endpoint
This is the **richer, slower** flow — likely for your own dashboard/demo.

**How it works:**
1. **No auth** (public endpoint)
2. **Intent classification**: First tries rule-based keywords (hot/warm/cold), falls back to LLM (GPT-4o-mini)
3. **Hybrid matching**: Keyword-first for hot intent, then vector + keyword boost
4. **LLM response generation**: Different generators per intent level:
   - **HOT** → Direct purchase recommendation, mention deals/installments
   - **WARM** → Comparative/educational, campaign as one option
   - **COLD** → Education-first, soft mention at the end
5. **Full analytics**: Session logged with intent type, confidence, similarity score
6. **Response caching**: Cold/no-match responses cached for 5 minutes

---

## Tech Stack

| Layer          | Technology                                                      |
| -------------- | --------------------------------------------------------------- |
| **Runtime**    | Node.js with ES Modules                                         |
| **Framework**  | Express.js v5                                                   |
| **Database**   | MongoDB via Mongoose v9                                         |
| **Embeddings** | OpenAI `text-embedding-3-small` via GitHub AI Inference endpoint |
| **LLM**        | `openai/gpt-4o-mini` via Azure AI Inference (GitHub Models)     |
| **Auth**       | SHA-256 hashed API keys (format: `sk-synaptic-{32hex}`)         |
| **Dashboard**  | Vite + React (separate app in `/dashboard`)                     |
| **IDs**        | nanoid for tracking codes and session IDs                       |

---

## Key Files and What They Do

| File               | Role                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `server.js`        | Express app — all endpoints: B2B query, agent registration, campaign CRUD, tracking, analytics |
| `db.js`            | Mongoose schemas (Campaign, Event, Agent, Session) + seed data with Uzbekistan market brands   |
| `agentAuth.js`     | Middleware: validates API key, attaches `req.agent`, increments request counter                 |
| `enrichment.js`    | Full enrichment pipeline: intent classification, campaign matching, LLM response generation    |
| `embeddings.js`    | Text embedding via OpenAI SDK + cosine similarity + in-memory embedding cache                  |
| `suggestion.js`    | Simple template builder for B2B responses ("Oh, so if you're interested in...")                |
| `dashboard/`       | Vite + React frontend (campaign management, analytics visualization)                           |

---

## Database Collections

### Campaigns
Products/brands that pay to be recommended. Each has:
- Name, category, brand URL, tagline, description
- Keywords (for fast text matching)
- Embedding vector (for semantic matching)
- CPC rate, CPA percentage, budget, daily impression cap
- Tracking code (nanoid) for click attribution
- Source: `partner` (real clients), `seed` (demo data), `scraped`
- Tone: `informative`, `promotional`, `comparative`, `deal-focused`

### Agents
External AI partners who call your API. Each has:
- Username, email, hashed API key
- Lifetime stats: total_requests, total_impressions, total_clicks
- Revenue earned (placeholder for future payout system)

### Events
Every impression, click, and conversion is logged with:
- Campaign ID, agent ID, event type
- User prompt (truncated to 500 chars for impressions)
- Conversion value and metadata (for CPA tracking)

### Sessions
Detailed per-request analytics (used by the enrich flow):
- User prompt, intent type (cold/warm/hot), confidence score
- Matched campaign, similarity score, whether response was enriched

---

## Performance Optimizations Already in Place

1. **Campaign cache** — Active campaigns loaded in-memory, refreshed every 60s
2. **Response cache** — Identical prompts return cached results for 5 min (cold/no-match only)
3. **Embedding cache** — Up to 1000 text embeddings cached in-memory
4. **Analytics cache** — Dashboard analytics cached for 10s
5. **Rule-based intent** — Hot/warm intents classified without LLM call (keyword rules in Uzbek, English, Russian)
6. **Keyword-first matching** — Hot intent + strong keyword match skips expensive vector search
7. **Fire-and-forget analytics** — Event logging is async, never blocks the response

---

## The Uzbekistan Market Focus

The seed data and keyword rules are heavily Uzbek-market focused:
- Brands: Uzum Market, Olcha, ZoodMall, Moda.uz, Yandex Eats
- Keywords in Uzbek: `sotib`, `narxi`, `qancha turadi`, `muddatli tolov`, `yetkazib berish`
- Keywords in Russian: `купить`, `цена`, `скидка`, `рассрочка`
- Installment plans (`muddatli to'lov`, `bo'lib to'lash`) are a major purchase signal
- Currency is likely UZS (budget values in millions)

---

## What I Think the Vision Is

You're building **the Google AdSense of AI agents**. Instead of ads on websites, you place contextual product recommendations inside AI conversations. The AI agent doesn't need to do anything special — they just forward the user's message to your API, and if there's a relevant product, they get a suggestion to append. They earn per click. Brands pay per click/conversion. You sit in the middle taking a cut.

The key insight: **AI agents need monetization**, and traditional banner ads don't work in chat interfaces. Conversational recommendations do.

---

## Related Documentation

- [Integration Guide](./integration-guide.md) — How to connect external agents to the Synaptic API.
- [Frontend Rebuild Guide](./frontend-rebuild-guide.md) — Notes on the dashboard migration.
- [System Design](./system-design.md) — Deep dive into the architecture.

1. **Dashboard scope** — The `/dashboard` folder has a Vite + React app, but I haven't read the React components yet. Not sure what it currently shows.
2. **Figma directory** — There's a `/figma` folder I haven't explored. Likely design assets.
3. **The `/api/enrich` flow vs `/authorized/send_result`** — Both do campaign matching, but with different approaches. Is `/api/enrich` only for internal use / the demo dashboard? Or do some agents use it too?
4. **Payout system** — `revenue_earned` exists on Agent but is always 0. The payout calculation logic doesn't exist yet.
5. **Budget enforcement** — Campaigns have `budget` and `spent` fields, but I don't see logic that stops serving a campaign when `spent >= budget`.
6. **Daily impression caps** — `max_daily_impressions` and `today_impressions` exist but `today_impressions` reset logic seems missing (there's a `last_reset_date` field but no cron/reset check).
7. **Multi-language LLM responses** — The system prompts say "match language" but the actual language detection is implicit (LLM figures it out from the prompt).
