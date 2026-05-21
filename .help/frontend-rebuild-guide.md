# Frontend Rebuild Guide — From Current Dashboard to Figma Design

> Full analysis of both codebases + step-by-step plan to rebuild the frontend.

---

## Part 1: Analysis — What We Have vs. What We Want

---

### Current Dashboard (`/dashboard`)

**Tech stack**: Vite + React 19 + vanilla CSS (dark theme, glassmorphism)  
**Structure**: One giant `App.jsx` (498 lines) that does everything  
**Styling**: `index.css` with CSS variables, dark radial-gradient background, glass effects  
**Libraries**: `recharts`, `lucide-react`  
**Router**: None — uses `useState('activeTab')` to switch tabs  

**What it contains** (all in one file):
- **Overview tab** — stat cards (impressions, clicks, conversions, CTR), intent pie chart, category bar chart, campaign performance table
- **AI Agents tab** — agent list table with stats, drill-down to individual agent (7-day chart)
- **Intent Analytics tab** — cold/warm/hot intent distribution cards
- **Live Demo tab** — textarea to test `/api/enrich` and `/authorized/send_result` with sample prompts
- **Campaigns tab** — campaign list table, drill-down to individual campaign dashboard (7-day chart)
- **Modals** — create campaign form, register agent form (with API key reveal)

**Problems with the current dashboard**:
1. Single 498-line file — no components, no separation
2. Dark glassmorphism theme — looks like a dev tool, not a product
3. All inline styles — extremely hard to maintain
4. No routing — everything is tab-based with useState
5. No clear separation between "Business view" and "Agent view"
6. Not presentable to external users (businesses or AI agent developers)

---

### Figma Design (`/figma`)

**Tech stack**: Vite + React 18 + TailwindCSS v4 + shadcn/ui  
**Structure**: Proper app architecture — `routes.tsx`, separate pages, component library  
**Styling**: Tailwind v4 with shadcn theme (CSS variables), light theme, `#0000FF` brand color  
**Libraries**: `recharts`, `lucide-react`, `react-router v7`, `motion` (framer-motion), Radix UI primitives  
**Router**: `react-router` with proper routes  
**UI Kit**: Full shadcn/ui component library (48 components)

**Pages defined in Figma**:

| Route                  | Page                  | What it shows                                                                                          |
| ---------------------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| `/`                    | `Home.tsx`            | Landing page with toggle: "For Businesses" / "For AI Agents". Hero sections, comparison table, CTA     |
| `/agent/analytics`     | `AgentAnalytics.tsx`  | Agent's revenue overview (area chart), total clicks (line chart), 4 stat cards                          |
| `/business/analytics`  | `BusinessAnalytics.tsx` | Business click analytics — daily clicks (bar chart), CPC trend (line chart), clicks-per-action table |
| `*`                    | `NotFound.tsx`        | 404 page with links to both analytics pages                                                            |

**Design language**:
- Clean white background, no dark mode yet
- Brand color: `#0000FF` (pure blue) for all accents, buttons, charts
- Black text with opacity variants (`text-black/60`)
- Cards with `border-2 border-black/10 rounded-xl`
- Consistent padding: `p-8` for cards, `p-6` for stat cards
- Max width container: `max-w-7xl mx-auto p-8`

---

## Part 2: What the Figma Design Is MISSING (Needs to be Built)

The Figma pages are **static mockups with hardcoded data**. They need to be wired to the backend. Here's what's missing:

### Home Page (`/`)
- ❌ All data is hardcoded (comparison table numbers, revenue calculations)
- ❌ No navigation bar / header — just raw content
- ❌ "Start Advertising" and "Get API Access" buttons don't do anything
- ❌ The API integration code example shows a fake SDK (`@adplatform/agent-sdk`) — should show the real `POST /authorized/send_result` API
- ❌ No link to Live Demo section
- ✅ Toggle between Business/Agent views works (local state)

### Agent Analytics (`/agent/analytics`)
- ❌ Title says "Business Analytics" but file is `AgentAnalytics.tsx` — naming confusion
- ❌ All chart data is hardcoded (12 months of fake revenue/visitors)
- ❌ Stat cards show fake numbers ($821K revenue, 271.8K visitors, etc.)
- ❌ No API calls — needs to call `GET /api/agents/:username/stats`
- ❌ No agent selector — doesn't know WHICH agent to show stats for
- ❌ "Export Report" / "Download Data" buttons are non-functional
- ❌ Missing: Actual revenue earned vs. clicks vs. impressions breakdown

### Business Analytics (`/business/analytics`)
- ❌ All chart data hardcoded (daily clicks, CPC trends, actions table)
- ❌ No API calls — needs to call `GET /api/dashboard/:campaignId` and `GET /api/analytics`
- ❌ No campaign selector — doesn't know WHICH campaign to show stats for
- ❌ "Export Report" / "Optimize Campaign" buttons non-functional
- ❌ "Adjust Budget" / "Campaign Settings" buttons non-functional

### What exists in the old dashboard but NOT in Figma yet
- ❌ **Live Demo page** — the prompt testing interface (`/api/enrich` + `/authorized/send_result`)
- ❌ **Campaign management** — create/edit/delete campaigns
- ❌ **Agent registration** — register new agent, show API key
- ❌ **Intent Analytics** — cold/warm/hot distribution
- ❌ **Overview/Admin page** — aggregate stats across all campaigns/agents

---

## Part 3: Backend API Endpoints Available

These are the APIs the new frontend needs to consume:

| Endpoint                           | Method | Auth | Purpose                                    | Used by             |
| ---------------------------------- | ------ | ---- | ------------------------------------------ | -------------------- |
| `/api/analytics`                   | GET    | No   | Overview stats (all campaigns)              | Business Overview    |
| `/api/intent-stats`               | GET    | No   | Intent distribution + hourly + top categories| Intent Analytics     |
| `/api/campaigns`                   | GET    | No   | List all campaigns                          | Campaign Management  |
| `/api/campaigns`                   | POST   | No   | Create new campaign                         | Campaign Form        |
| `/api/campaigns/:id`              | PUT    | No   | Update campaign                             | Campaign Edit        |
| `/api/campaigns/:id`              | DELETE | No   | Delete campaign                             | Campaign Management  |
| `/api/dashboard/:campaignId`      | GET    | No   | Single campaign stats + 7-day chart         | Business Analytics   |
| `/api/agents`                      | GET    | No   | List all agents                             | Agent Management     |
| `/api/agents/register`            | POST   | No   | Register new agent → returns API key        | Agent Registration   |
| `/api/agents/:username/stats`     | GET    | No   | Single agent stats + 7-day chart            | Agent Analytics      |
| `/api/enrich`                      | POST   | No   | Full LLM enrichment (demo)                  | Live Demo            |
| `/authorized/send_result`         | POST   | Key  | B2B fast query (production)                 | Live Demo            |
| `/api/sessions`                    | GET    | No   | Recent sessions                             | Intent Analytics     |
| `/api/cache/clear`                | POST   | No   | Clear caches                                | Admin                |
| `/t/:code`                         | GET    | No   | Tracking redirect (click tracking)          | Generated links      |
| `/api/conversion`                  | POST   | No   | Track conversion event                      | External use         |

---

## Part 4: Step-by-Step Build Plan

---

### Step 0: Decision — Fresh Build vs. Migrate

**Recommendation: Fresh build inside `/dashboard`, using the Figma code as reference.**

Why:
- The current dashboard is a single 498-line file with no structure — not worth saving
- The Figma project uses a completely different tech stack (Tailwind v4 + shadcn vs. vanilla CSS)
- We need proper routing, component architecture, and TypeScript
- We'll copy the shadcn components from the Figma project directly

---

### Step 1: Set Up the New Dashboard Project

1. **Reinitialize `/dashboard`** with Vite + React + TypeScript
2. **Install dependencies** from the Figma project:
   - Core: `react`, `react-dom`, `react-router` (v7)
   - UI: All Radix UI primitives (copy from figma `package.json`)
   - Styling: `tailwindcss` v4, `@tailwindcss/vite`, `tw-animate-css`, `tailwind-merge`, `class-variance-authority`, `clsx`
   - Charts: `recharts`
   - Icons: `lucide-react`
   - Animations: `motion` (framer-motion)
   - Utilities: `date-fns`, `sonner` (toasts)
3. **Copy the entire `src/app/components/ui/` directory** from Figma — this is the shadcn component library (48 components, already configured)
4. **Copy the styles** from Figma: `tailwind.css`, `theme.css`, `fonts.css`
5. **Copy the Vite config** from Figma (with Tailwind plugin + path aliases)
6. **Verify it runs** with `npm run dev`

---

### Step 2: Define the Route Structure

```
/                          → Home (landing page with Business/Agent toggle)
/demo                      → Live Demo (prompt testing)
/business/analytics        → Business Analytics Dashboard
/business/campaigns        → Campaign Management (list + create)
/business/campaigns/:id    → Single Campaign Dashboard
/agent/analytics           → Agent Analytics Dashboard  
/agent/analytics/:username → Single Agent Stats
/agent/register            → Agent Registration
*                          → 404 NotFound
```

Create `routes.tsx` with all these routes using `react-router` v7.

---

### Step 3: Build the Shared Layout

Create a **persistent layout component** that wraps all pages:

1. **Navigation bar** (top):
   - Logo: "Synaptic AI" with branding
   - Links: Home, Demo, Business Dashboard, Agent Dashboard
   - "Register Agent" + "New Campaign" action buttons on the right
2. **Footer** (optional, simple)
3. Use the Figma design language: white bg, `max-w-7xl mx-auto`, clean borders

---

### Step 4: Build the API Client Layer

Create `src/lib/api.ts` — a central API client:

```
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3006'

export const api = {
  // Analytics
  getAnalytics()                    → GET /api/analytics
  getIntentStats()                  → GET /api/intent-stats
  
  // Campaigns
  getCampaigns()                    → GET /api/campaigns
  createCampaign(data)              → POST /api/campaigns
  updateCampaign(id, data)          → PUT /api/campaigns/:id
  deleteCampaign(id)                → DELETE /api/campaigns/:id
  getCampaignDashboard(id)          → GET /api/dashboard/:id
  
  // Agents
  getAgents()                       → GET /api/agents
  registerAgent(data)               → POST /api/agents/register
  getAgentStats(username)           → GET /api/agents/:username/stats
  
  // Demo
  enrich(prompt)                    → POST /api/enrich
  sendResult(prompt, apiKey)        → POST /authorized/send_result
  
  // Sessions
  getSessions(limit?, intentType?)  → GET /api/sessions
  
  // Cache
  clearCache()                      → POST /api/cache/clear
}
```

---

### Step 5: Build Pages One by One

#### 5A. Home Page (`/`)

**Source**: Copy from Figma `Home.tsx` and enhance.

- Keep the Business/Agent toggle
- **Business view**: Hero section, comparison table, CTA → links to `/business/analytics`
- **Agent view**: How-it-works, revenue potential, integration example → links to `/agent/register` and `/agent/analytics`
- **Fix the integration example** to show the real API:
  ```
  POST /authorized/send_result
  {
    "prompt": "user message",
    "api_key": "sk-synaptic-..."
  }
  ```
- Add link to `/demo` for live testing

#### 5B. Live Demo Page (`/demo`)

**Source**: Port from current dashboard's "demo" tab.

- Prompt textarea
- Quick-fill buttons (hot/warm/cold intent examples in Uzbek)
- Two test buttons: "Test /api/enrich (LLM)" and "Test /authorized/send_result (B2B)"
- Response display with:
  - Intent badge (cold/warm/hot with color)
  - Matched campaign name
  - Response text
  - Performance metrics (latency, match method, tokens used)
- **Style in Figma design language** (white bg, blue accents, bordered cards)

#### 5C. Business Analytics Page (`/business/analytics`)

**Source**: Start from Figma `BusinessAnalytics.tsx`, wire to real API.

1. **Add campaign selector** at the top — dropdown or card grid to pick a campaign
2. **Stat cards** (4 cards): Total Clicks, Cost Per Click, Total Spent, Clicks Per Day
   - Data from: `GET /api/dashboard/:campaignId` → `totals`
3. **Daily Click Performance** (bar chart):
   - Data from: `GET /api/dashboard/:campaignId` → `daily_stats`
4. **CPC Trend** (line chart):
   - Data calculated from: daily spent / daily clicks
5. **Clicks Per Action table**:
   - Data from: `GET /api/analytics` → campaign-level breakdown
6. **Budget info**: Budget remaining, budget used %, spent amount
   - Data from: `GET /api/dashboard/:campaignId` → `campaign.budget`, `campaign.spent`

**What's new (not in Figma but needed)**:
- Campaign selector / picker
- Campaign CRUD (create/edit/delete) — either inline or separate page
- Budget remaining progress bar
- Conversion tracking stats

#### 5D. Agent Analytics Page (`/agent/analytics`)

**Source**: Start from Figma `AgentAnalytics.tsx`, wire to real API.

1. **Add agent selector** at the top — list of registered agents
2. **Stat cards** (4 cards): Total Revenue (clicks × CPC), Total Impressions, Clicks, CTR
   - Data from: `GET /api/agents/:username/stats` → `totals`
3. **Revenue Overview** (area chart):
   - Data from: `GET /api/agents/:username/stats` → `daily_stats` (calculate revenue from clicks × avg CPC)
4. **Total Clicks** (line chart):
   - Data from: `GET /api/agents/:username/stats` → `daily_stats`
5. **Agent info card**: Username, email, status, last seen, total requests

**What's new (not in Figma but needed)**:
- Agent selector
- Link to the agent's API key / integration docs
- "How to integrate" inline documentation

#### 5E. Agent Registration Page (`/agent/register`)

**Source**: Port from current dashboard's agent modal.

- Form: Username (bot ID), Owner Email
- Submit → `POST /api/agents/register`
- On success: Show API key with copy button + integration example
- Warning: "Store this key — it won't be shown again"

#### 5F. Campaign Management Page (`/business/campaigns`)

**Source**: Port from current dashboard's campaign tab + modal.

- Campaign list table (from `GET /api/campaigns`)
- "New Campaign" button → form/modal
- Campaign form fields: Name, Category, Brand URL, Link Label, Tagline, Description, Keywords, CPC Rate, CPA %, Tone, Budget
- Click campaign row → navigate to `/business/campaigns/:id` for detailed dashboard

#### 5G. 404 Page

**Source**: Copy from Figma `NotFound.tsx`, already done.

---

### Step 6: Wire Up Real Data

For each page, replace the hardcoded mock data with actual API calls:

1. Use `useEffect` + `fetch` (or create a custom `useApi` hook)
2. Add loading skeletons (shadcn has a `<Skeleton>` component)
3. Add error states
4. Add auto-refresh where appropriate (analytics pages polling every 5-10s)
5. Add `sonner` toasts for success/error feedback on mutations

---

### Step 7: Add Missing Backend Features

The current backend may need these additions to fully support the analytics pages:

1. **Agent revenue calculation**: Currently `revenue_earned` is always 0. Need an endpoint or calculation:
   ```
   revenue = SUM(click_events for this agent × campaign.cpc_rate)
   ```
   
2. **Per-agent campaign breakdown**: Which campaigns is this agent generating clicks for?
   ```
   GET /api/agents/:username/campaigns → list of campaigns with click counts
   ```

3. **Business daily spend**: The backend tracks `campaign.spent` but not daily spend history. May need:
   ```
   GET /api/dashboard/:id/spend-history → daily spend over time
   ```

4. **Budget enforcement** (nice-to-have): Stop serving campaigns when `spent >= budget`

---

### Step 8: Polish and Ship

1. **Responsive design** — test on mobile, tablet, desktop
2. **Dark mode toggle** — the Figma theme CSS already has `.dark` class variables defined
3. **Loading states** — skeleton screens for all data-driven sections
4. **Empty states** — "No campaigns yet" / "No agents registered" with CTA
5. **Animations** — use `motion` library for page transitions and card animations
6. **SEO** — proper title tags, meta descriptions per page
7. **Environment variables** — `VITE_API_URL` for API base URL (dev vs. production)

---

## Part 5: File Structure (Target)

```
dashboard/
├── index.html
├── package.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── styles/
│   │   ├── index.css
│   │   ├── tailwind.css
│   │   ├── theme.css
│   │   └── fonts.css
│   ├── app/
│   │   ├── App.tsx                    ← RouterProvider
│   │   ├── routes.tsx                 ← All routes defined here
│   │   ├── Layout.tsx                 ← Shared nav + footer wrapper
│   │   ├── pages/
│   │   │   ├── Home.tsx               ← Landing (Business/Agent toggle)
│   │   │   ├── Demo.tsx               ← Live API testing
│   │   │   ├── BusinessAnalytics.tsx  ← Per-campaign analytics
│   │   │   ├── CampaignManagement.tsx ← Campaign CRUD
│   │   │   ├── AgentAnalytics.tsx     ← Per-agent analytics
│   │   │   ├── AgentRegister.tsx      ← Agent signup + API key
│   │   │   └── NotFound.tsx           ← 404
│   │   └── components/
│   │       ├── ui/                    ← shadcn components (copied from figma)
│   │       │   ├── button.tsx
│   │       │   ├── card.tsx
│   │       │   ├── chart.tsx
│   │       │   ├── table.tsx
│   │       │   ├── dialog.tsx
│   │       │   ├── skeleton.tsx
│   │       │   ├── tabs.tsx
│   │       │   ├── badge.tsx
│   │       │   ├── input.tsx
│   │       │   ├── select.tsx
│   │       │   ├── ... (48 total)
│   │       │   └── utils.ts
│   │       ├── StatCard.tsx           ← Reusable stat card
│   │       ├── CampaignSelector.tsx   ← Campaign dropdown/picker
│   │       ├── AgentSelector.tsx      ← Agent dropdown/picker
│   │       ├── IntentBadge.tsx        ← Cold/Warm/Hot badge
│   │       └── Navbar.tsx             ← Top navigation
│   └── lib/
│       ├── api.ts                     ← All API calls
│       └── utils.ts                   ← Shared helpers
```

---

## Part 6: Execution Order (Priority)

| Phase | What                                   | Why                                          |
| ----- | -------------------------------------- | -------------------------------------------- |
| 1     | Project setup + shadcn components      | Foundation — everything else depends on this  |
| 2     | Layout + Navbar + Routes               | Navigation between pages must work            |
| 3     | Home page                              | First thing visitors see                      |
| 4     | API client (`lib/api.ts`)              | All data pages need this                      |
| 5     | Business Analytics page                | Core value prop for advertisers               |
| 6     | Agent Analytics page                   | Core value prop for AI agent partners         |
| 7     | Live Demo page                         | Proves the product works                      |
| 8     | Campaign Management                    | Businesses need to create/manage campaigns    |
| 9     | Agent Registration                     | Agents need to sign up                        |
| 10    | Polish (loading states, animations)    | Make it production-ready                      |
| 11    | Backend additions (revenue calc, etc.) | Support analytics page data needs             |

---

## Part 7: Design Decisions to Make Before Starting

1. **Keep Figma's Tailwind v4 stack or use something simpler?**
   - Figma uses TailwindCSS v4 (the `@import 'tailwindcss' source(none)` syntax). This is fine but means we're committed to Tailwind.
   - The old dashboard used vanilla CSS. 
   - **Recommendation**: Use Tailwind v4 + shadcn as the Figma project does — the component library is already built.

2. **TypeScript or JavaScript?**
   - Figma project uses TypeScript (`.tsx`)
   - Old dashboard uses JavaScript (`.jsx`)
   - **Recommendation**: TypeScript — the Figma components are already typed.

3. **React 18 or 19?**
   - Figma uses React 18 (peer dependency)
   - Old dashboard uses React 19
   - **Recommendation**: Use React 18 to match the shadcn components. Or test with 19 — it should be compatible.

4. **Where does the new dashboard live?**
   - Option A: Replace `/dashboard` contents entirely
   - Option B: Build in a new folder, then swap
   - **Recommendation**: Replace `/dashboard` — it's a dev throwaway anyway.

5. **Does the backend need new endpoints?**
   - Agent revenue: YES (need a way to calculate `clicks × CPC_rate`)
   - Daily spend history: NICE TO HAVE
   - Budget enforcement: LATER
   - **Recommendation**: Start with what exists, add backend endpoints as needed.
