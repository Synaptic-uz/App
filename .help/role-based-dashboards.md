# Step-by-Step Execution: Role-Based Dashboards & Telegram Demo

## 1. Architectural Shift: Role-Based Access Control (RBAC)
Currently, the frontend is an "Admin" view where you can select any campaign or any agent from a dropdown. We need to transition this into a multi-tenant system.

### A. Backend Authentication
- **User Models**: Create a `User` model in MongoDB with roles: `business` and `agent` (or link the existing `Agent` model to a login).
- **Auth Routes**: Add `/api/auth/register` and `/api/auth/login` returning JWTs.
- **Data Isolation**: 
  - Update `GET /api/dashboard/:campaignId` so a business can only fetch data for campaigns they own.
  - Update `GET /api/agents/:username/stats` so an agent can only fetch data for their own username.

### B. Frontend Authentication
- **Login/Signup Pages**: Build pages for Business Login and Agent Login.
- **Auth Context**: Wrap the React app in an AuthProvider to store the JWT token and user role.
- **Protected Routes**: 
  - Restrict `/business/*` routes to `business` users.
  - Restrict `/agent/*` routes to `agent` users.
- **Remove Global Selectors**: Remove the "Select Campaign" and "Select Agent" dropdowns from the analytics pages. Instead, the page automatically fetches the data belonging to the logged-in user.

---

## 2. Building the Telegram-Style "Live Demo"

The "View Analytics Demo" button on the Home page currently points to the analytics pages. We will change this to point to a new `/demo` route.

### A. UI Design (Telegram Clone)
- Create a new page: `dashboard/src/app/pages/ChatDemo.tsx`.
- Design a chat interface mimicking Telegram (gray background, green/blue chat bubbles for user, white chat bubbles for the AI).
- Include an input field at the bottom to type prompts.

### B. API Integration
- Wire the chat input to the existing API endpoints. We have two options:
  1. **`/api/enrich` (LLM)**: Takes a prompt and returns the full LLM text along with the matched ad.
  2. **`/authorized/send_result` (B2B)**: Simulates the fast intent-matching response.
- When the user sends a message, display it in the chat. Show a "typing..." indicator, then hit the API.
- Parse the API response and display the AI's answer in a chat bubble.
- **Displaying the Ad**: If the API returns `match: true`, display the `suggestion` text and the `tracking_url` as an interactive button inside the chat bubble (just like a real Telegram bot would send an inline button).

### C. State Management
- Maintain an array of `messages` in local state.
- Each message object will have: `id`, `sender` (user or bot), `text`, `timestamp`, and optionally `adData` (if an ad was matched).

---

## 3. Execution Steps (Order of Operations)

**Phase 1: The Chat Demo (Immediate Visual Value)**
1. Create `ChatDemo.tsx` in the frontend.
2. Build the Telegram-style UI components.
3. Wire up the `api.enrich` or `api.sendResult` functions.
4. Update `Home.tsx` to link "View Analytics Demo" to the new `/demo` route.

**Phase 2: Backend Auth & Isolation**
1. Update `db.js` to support User accounts and Ownership (e.g., add `owner_id` to Campaigns).
2. Implement JWT login endpoints in Node.js.
3. Secure the analytics API endpoints to enforce ownership.

**Phase 3: Frontend Roles**
1. Build Login & Registration pages.
2. Implement React Context for auth state.
3. Modify `BusinessAnalytics.tsx` to fetch the logged-in user's campaigns.
4. Modify `AgentAnalytics.tsx` to fetch the logged-in agent's stats.
5. Clean up the Layout navigation so Businesses don't see Agent links, and vice versa.
