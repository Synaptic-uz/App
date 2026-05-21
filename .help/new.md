# Synaptic AI — B2B Agent Query System Design

> Revised & Finalized Plan (no code changes yet)

---

## What Is This Layer?

External AI agents (Telegram bots, web chatbots, AI wrappers, etc.) integrate our API
to silently enrich their answers with relevant product/brand suggestions.

They are NOT our end users. They are **distribution partners** — they bring the eyeballs,
we bring the monetizable recommendations. More clicks through their platform = they earn.

---

## Business Model: Pay-As-You-Go (Click-Based / CPC)

**No subscriptions. No monthly fees. No request limits.**

```
AI Agent sends us requests → We match products → We return suggestion
→ User sees suggestion → User clicks tracking link → CLICK EVENT
→ AI Agent earns a commission per click
```

The logic is simple:

- More active the AI agent is → more impressions → more clicks → more revenue
- **Limiting requests would hurt both sides.** So there is NO rate limiting.
- For now: clicks are tracked in DB, payout logic comes later.
- DB must be built click-ready from day one.

---

## Endpoint: `/authorized/send_result`

This is the production B2B endpoint. External AI agents call it like:

```
POST /authorized/send_result
Content-Type: application/json

{
  "prompt": "the exact message the user sent to the AI agent",
  "api_key": "sk-synaptic-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "agent_id": "my-telegram-bot"    ← optional but recommended
}
```

> Note: api_key can also go in header as `X-Synaptic-Key` — we support both for flexibility.

---

## What Happens Inside

```
[POST /authorized/send_result]
        |
        ├─ 1. Validate api_key
        │       ├── Not found? → return { match: false }  ← agent not registered
        │       └── Found?     → attach agent info, continue
        |
        ├─ 2. embedText(prompt) → vector
        |
        ├─ 3. Cosine Similarity vs all active Campaigns in DB
        |
        ├─ 4a. Match found (score > threshold)?
        │         ├── Build "Soft Suggestion" string (template, no LLM call)
        │         ├── Create tracking URL: /t/{tracking_code}
        │         ├── Log Event { type: 'impression', campaign_id, agent_id }
        │         └── Return { match: true, suggestion, tracking_url, campaign }
        |
        └─ 4b. No match?
                  └── Return { match: false }
                              ← nothing logged, AI agent's answer unaffected
```

**Critical rule:** On no match, return `{ match: false }` — NEVER an error, NEVER null.
This guarantees the AI agent's own response pipeline never breaks.

---

## The "Soft Suggestion" Response Format

When a match is found, we return a structured JSON — NOT a full LLM answer:

```json
{
	"match": true,
	"intent": "smartphones with installment",
	"suggestion": "Oh, so if you're interested in smartphones, you might wanna check out Uzum Market — they offer installment plans with free delivery.",
	"tracking_url": "http://synaptic.uz/t/abc123xyz",
	"campaign": {
		"name": "Uzum Market",
		"category": "electronics"
	}
}
```

### When no match is found:

```json
{
	"match": false
}
```

**Why `{ match: false }` and not `null` or an error?**
Because the AI agent does:

```js
const result = await synapticAPI.query(prompt);
if (result.match) {
	// append suggestion to their response
}
// otherwise — do nothing, their response is unaffected
```

Clean. Safe. Non-intrusive.

---

## 3. The Suggestion String Format

The suggestion must feel conversational, not like a banner ad. The format:

```
"Oh, so if you're interested in {intent/category},
you might wanna check out {campaign.name} — {campaign.tagline}."
```

- `tagline` — advertiser provides this when creating campaign (1 sentence max)
- We build this with **string templates only** — no LLM call for this endpoint
- Latency target: **~200–400ms total** (embed + DB lookup only)

---

## On No Match

```json
{ "match": false }
```

AI agent integration example:

```js
const synaptic = await fetch("/authorized/send_result", { ... }).then(r => r.json());

// Agent's own answer is ALWAYS sent
const agentAnswer = await myLLM.respond(userMessage);

// We only append if there's a match
if (synaptic.match) {
  return agentAnswer + "\n\n💡 " + synaptic.suggestion;
}

return agentAnswer; // ← completely clean, no interference
```

---

## DB Schema Plan

### `Agent` Collection — Who is calling us?

| Field               | Type    | Description                                                   |
| ------------------- | ------- | ------------------------------------------------------------- |
| `username`          | String  | Human-readable ID ("my-telegram-bot")                         |
| `owner_email`       | String  | Contact for billing/notifications                             |
| `api_key_hash`      | String  | SHA-256 hash of actual key (never store plaintext)            |
| `active`            | Boolean | Deactivate bad actors (default: true)                         |
| `total_requests`    | Number  | Lifetime request counter (analytics only)                     |
| `total_impressions` | Number  | How many times a product was matched & returned               |
| `total_clicks`      | Number  | How many clicks came through their platform ← REVENUE TRIGGER |
| `revenue_earned`    | Number  | Future: sum of (click × CPC_rate), default 0 for now          |
| `joined_at`         | Date    | Registration timestamp                                        |

> **No `rate_limit`, no `requests_today`** — unlimited by design.

---

### `Campaign` Collection — What do we sell?

Current fields are fine. Add:

| Field     | Type   | Description                                          |
| --------- | ------ | ---------------------------------------------------- |
| `tagline` | String | 1-sentence brand description for suggestion template |

Example: `"Official electronics store with installment plans and same-day delivery"`

---

### `Event` Collection — Every interaction logged

Current: `{ campaign_id, type: 'impression' | 'click' }`

Add:

| Field         | Type   | Description                                             |
| ------------- | ------ | ------------------------------------------------------- |
| `agent_id`    | String | Which AI agent triggered this event (for revenue calc)  |
| `user_prompt` | String | Optional: the original prompt (for analytics/debugging) |

This way, when we later calculate revenue:

```
agent.revenue_earned = COUNT(events WHERE type='click' AND agent_id=X) × CPC_RATE
```

DB is ready for payout logic from day one.

---

### `Agent` Click Tracking Flow (future-proof)

```
User clicks tracking_url (/t/{code})
        |
        ├─ Redirect to brand_url (existing behavior)
        ├─ Create Event { type: 'click', campaign_id, agent_id }  ← NEW
        └─ Increment Agent.total_clicks + Agent.revenue_earned (future)
```

For now: just log the click with `agent_id`. Revenue calculation = later feature.

---

## Comparison: `/api/enrich` vs `/authorized/send_result`

|                    | `/api/enrich`             | `/authorized/send_result`     |
| ------------------ | ------------------------- | ----------------------------- |
| **Purpose**        | Demo for dashboard        | Real B2B production           |
| **Auth**           | None                      | API key required              |
| **LLM call?**      | Yes (full answer)         | No (template only, fast)      |
| **Response**       | Full markdown text        | Short structured JSON         |
| **On no match**    | Standard LLM answer       | `{ match: false }`            |
| **Agent tracking** | No                        | Yes (agent_id on every event) |
| **Latency**        | ~2–4 sec                  | ~200–400ms                    |
| **Breaks agent?**  | Yes (can't safely append) | Never                         |

---

## Files to Create/Modify (implementation phase)

| File                    | Action | Summary                                                            |
| ----------------------- | ------ | ------------------------------------------------------------------ |
| `db.js`                 | MODIFY | Add `Agent` schema, add `tagline` + `agent_id` to existing schemas |
| `agentAuth.js`          | NEW    | Middleware: hash key → find agent → attach `req.agent`             |
| `suggestion.js`         | NEW    | Template builder: takes campaign → returns suggestion string       |
| `server.js`             | MODIFY | Add `POST /authorized/send_result`, `POST /api/agents/register`    |
| `dashboard/src/App.jsx` | MODIFY | Show registered agents + per-agent click/impression stats          |

> **Waiting for user "go ahead" before touching any code.**
