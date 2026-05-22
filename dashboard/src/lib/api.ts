const API_BASE = import.meta.env.VITE_API_URL || '/api';
const AUTH_BASE = import.meta.env.VITE_AUTH_URL || '/authorized';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

async function parseJsonResponse(res: Response) {
  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.error || 'Request failed');
  }
  return result;
}

export const api = {
  // Auth
  login: async (data: { email: string; password: string }) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(res);
  },
  register: async (data: { email: string; password: string; role: string }) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(res);
  },

  // Analytics
  getAnalytics: async () => {
    const res = await fetch(`${API_BASE}/analytics`, { headers: getHeaders() });
    return parseJsonResponse(res);
  },
  getIntentStats: async () => {
    const res = await fetch(`${API_BASE}/intent-stats`, { headers: getHeaders() });
    return parseJsonResponse(res);
  },

  getCategories: async () => {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error('Failed to load categories');
    return res.json();
  },

  // Campaigns
  getCampaigns: async () => {
    const res = await fetch(`${API_BASE}/campaigns`, { headers: getHeaders() });
    return parseJsonResponse(res);
  },
  createCampaign: async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return parseJsonResponse(res);
  },
  updateCampaign: async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}/campaigns/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return parseJsonResponse(res);
  },
  deleteCampaign: async (id: string) => {
    const res = await fetch(`${API_BASE}/campaigns/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return parseJsonResponse(res);
  },
  getCampaignDashboard: async (id: string) => {
    const res = await fetch(`${API_BASE}/dashboard/${id}`, { headers: getHeaders() });
    return parseJsonResponse(res);
  },

  // Agents
  getAgents: async () => {
    const res = await fetch(`${API_BASE}/agents`, { headers: getHeaders() });
    return parseJsonResponse(res);
  },
  registerAgent: async (data: { username: string; owner_email: string }) => {
    const res = await fetch(`${API_BASE}/agents/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return parseJsonResponse(res);
  },
  getAgentStats: async (username: string) => {
    const res = await fetch(`${API_BASE}/agents/${username}/stats`, { headers: getHeaders() });
    return parseJsonResponse(res);
  },

  // Demo
  enrich: async (prompt: string, options?: { answerOnly?: boolean }) => {
    const res = await fetch(`${API_BASE}/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, answer_only: options?.answerOnly ?? false }),
    });
    return parseJsonResponse(res);
  },
  sendResult: async (prompt: string, apiKey: string) => {
    const res = await fetch(`${AUTH_BASE}/send_result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, api_key: apiKey }),
    });
    if (!res.ok) {
      // B2B contract: on failure, treat as no match — never surface errors to agents
      return { match: false };
    }
    const data = await res.json();
    // Only return structured match data; ignore any stray error fields
    if (!data.match) return { match: false };
    return data;
  },

  // Sessions
  getSessions: async (limit = 50, intentType?: string) => {
    let url = `${API_BASE}/sessions?limit=${limit}`;
    if (intentType) url += `&intent_type=${intentType}`;
    const res = await fetch(url);
    return parseJsonResponse(res);
  },

  // Cache
  clearCache: async () => {
    const res = await fetch(`${API_BASE}/cache/clear`, { method: 'POST' });
    return parseJsonResponse(res);
  },
};
