/** Relative paths use Vite proxy in dev (see vite.config.ts). */
const API_BASE = import.meta.env.VITE_API_URL || '/api';
const AUTH_BASE = import.meta.env.VITE_AUTH_URL || '/authorized';

const NETWORK_ERROR_MSG =
	'Ilovada xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko‘ring.';

const TOKEN_KEY = 'token';
const REFRESH_KEY = 'refreshToken';
const USER_KEY = 'user';

let refreshInFlight: Promise<string | null> | null = null;

export function getStoredToken() {
	return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken() {
	return localStorage.getItem(REFRESH_KEY);
}

export function persistAuthSession(data: {
	token?: string;
	accessToken?: string;
	refreshToken?: string;
	user: { id?: string; email: string; role: string };
}) {
	const access = data.accessToken || data.token;
	if (access) localStorage.setItem(TOKEN_KEY, access);
	if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
	localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearAuthSession() {
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem(REFRESH_KEY);
	localStorage.removeItem(USER_KEY);
}

import i18n from '../i18n';

const getHeaders = () => {
	const token = getStoredToken();
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'Accept-Language': i18n.language || 'uz',
	};
	if (token) headers['Authorization'] = `Bearer ${token}`;
	return headers;
};

function apiRouteMissingHint(status: number, body: string): string | null {
	if (status !== 404) return null;
	if (
		!body.includes('Cannot PATCH') &&
		!body.includes('Cannot PUT') &&
		!body.includes('<!DOCTYPE')
	) {
		return null;
	}
	return 'API topilmadi. FastAPI backend (port 3007) ishlayotganini tekshiring yoki `dashboard` da `npm run dev` proxy ishlatilganini tekshiring.';
}

async function parseJsonResponse(res: Response) {
	const raw = await res.text();
	let result: {
		status?: string;
		status_code?: number;
		message?: string;
		data?: any;
		error?: string; // Legacy support for other APIs if any
		code?: string;
	};
	try {
		result = raw ? JSON.parse(raw) : {};
	} catch {
		const hint = apiRouteMissingHint(res.status, raw);
		throw new Error(
			hint || (res.ok ? 'Javob o‘qib bo‘lmadi' : NETWORK_ERROR_MSG)
		);
	}

	if (res.status === 401) {
		clearAuthSession();
		window.location.href = '/login';
	}

	if (!res.ok || result.status === false) {
		const hint = apiRouteMissingHint(res.status, raw);
		
		const statusCodeKey = typeof result.status_code === 'string' ? result.status_code : null;
		const translatedMessage = statusCodeKey ? i18n.t(statusCodeKey) : result.message;

		const err = new Error(
			hint || translatedMessage || result.error || 'So‘rov bajarilmadi'
		) as Error & {
			code?: string;
			status?: number;
			data?: any;
		};
		err.code = statusCodeKey || result.code || (result.data?.code as string);
		err.status = typeof result.status_code === 'number' ? result.status_code : res.status;
		err.data = result.data;
		throw err;
	}

	// For Synaptic API, we return the 'data' part if it exists, 
	// otherwise return the whole object for compatibility.
	return result.data !== undefined ? result.data : result;
}

async function safeFetch(input: RequestInfo | URL, init?: RequestInit) {
	try {
		return await fetch(input, init);
	} catch {
		throw new Error(NETWORK_ERROR_MSG);
	}
}

async function refreshAccessToken(): Promise<string | null> {
	const refreshToken = getStoredRefreshToken();
	if (!refreshToken) return null;

	if (!refreshInFlight) {
		refreshInFlight = (async () => {
			try {
				const res = await safeFetch(`${API_BASE}/auth/refresh`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ refreshToken }),
				});
				if (!res.ok) {
					clearAuthSession();
					return null;
				}
				const data = await res.json();
				persistAuthSession(data);
				return data.accessToken || data.token;
			} catch {
				clearAuthSession();
				return null;
			} finally {
				refreshInFlight = null;
			}
		})();
	}

	return refreshInFlight;
}

export async function authFetch(path: string, init: RequestInit = {}) {
	const url = path.startsWith('http')
		? path
		: `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
	const doFetch = () =>
		safeFetch(url, {
			...init,
			headers: { ...getHeaders(), ...(init.headers as Record<string, string>) },
		});

	let res = await doFetch();

	if (res.status === 403 || res.status === 401) {
		const newToken = await refreshAccessToken();
		if (newToken) {
			res = await doFetch();
		} else if (res.status === 403) {
			try {
				const errBody = await res.clone().json();
				if (errBody.code === 'SESSION_REVOKED') clearAuthSession();
			} catch {
				/* ignore */
			}
		}
	}

	return res;
}

export const api = {
	login: async (data: { email: string; password: string }) => {
		const res = await safeFetch(`${API_BASE}/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		});
		const result = await parseJsonResponse(res);
		persistAuthSession(result);
		return result;
	},
	register: async (data: { email: string; password: string; role: string }) => {
		const res = await safeFetch(`${API_BASE}/auth/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		});
		const result = await parseJsonResponse(res);
		persistAuthSession(result);
		return result;
	},
	me: async () => {
		const res = await authFetch('/auth/me');
		return parseJsonResponse(res);
	},
	updateProfile: async (data: {
		display_name?: string;
		company_name?: string;
		phone?: string;
	}) => {
		let res = await authFetch('/auth/profile', {
			method: 'PATCH',
			body: JSON.stringify(data),
		});
		if (res.status === 404) {
			res = await authFetch('/auth/profile', {
				method: 'PUT',
				body: JSON.stringify(data),
			});
		}
		return parseJsonResponse(res);
	},
	changePassword: async (data: {
		current_password: string;
		new_password: string;
	}) => {
		let res = await authFetch('/auth/password', {
			method: 'PATCH',
			body: JSON.stringify(data),
		});
		if (res.status === 404) {
			res = await authFetch('/auth/password', {
				method: 'PUT',
				body: JSON.stringify(data),
			});
		}
		const result = await parseJsonResponse(res);
		if (result.accessToken || result.token) {
			persistAuthSession(result);
		}
		return result;
	},
	refresh: refreshAccessToken,
	logout: async () => {
		try {
			const res = await authFetch('/auth/logout', { method: 'POST' });
			if (res.ok) await res.json();
		} catch {
			/* ignore */
		}
		clearAuthSession();
	},

	getAuthSessions: async () => {
		const res = await authFetch('/auth/sessions');
		return parseJsonResponse(res);
	},
	revokeSession: async (sessionId: string) => {
		const res = await authFetch(`/auth/sessions/${sessionId}`, {
			method: 'DELETE',
		});
		return parseJsonResponse(res);
	},
	revokeAllSessions: async () => {
		const res = await authFetch('/auth/sessions/revoke-all', {
			method: 'POST',
		});
		return parseJsonResponse(res);
	},

	getWallet: async () => {
		const res = await authFetch('/wallet');
		return parseJsonResponse(res);
	},
	getWalletTransactions: async () => {
		const res = await authFetch('/wallet/transactions');
		return parseJsonResponse(res);
	},
	depositWallet: async (amount: number, note?: string) => {
		const res = await authFetch('/wallet/deposit', {
			method: 'POST',
			body: JSON.stringify({ amount, note }),
		});
		return parseJsonResponse(res);
	},
	allocateWallet: async (campaign_id: string, amount: number) => {
		const res = await authFetch('/wallet/allocate', {
			method: 'POST',
			body: JSON.stringify({ campaign_id, amount }),
		});
		return parseJsonResponse(res);
	},
	deallocateWallet: async (campaign_id: string, amount?: number) => {
		const res = await authFetch('/wallet/deallocate', {
			method: 'POST',
			body: JSON.stringify({ campaign_id, amount }),
		});
		return parseJsonResponse(res);
	},

	getAnalytics: async () => {
		const res = await authFetch('/analytics');
		return parseJsonResponse(res);
	},
	getIntentStats: async () => {
		const res = await authFetch('/intent-stats');
		return parseJsonResponse(res);
	},

	getCategories: async () => {
		const res = await safeFetch(`${API_BASE}/categories`);
		if (!res.ok) throw new Error('Kategoriyalar yuklanmadi');
		return res.json();
	},

	previewCampaignProfile: async (data: Record<string, unknown>) => {
		const res = await authFetch('/campaigns/profile-preview', {
			method: 'POST',
			body: JSON.stringify(data),
		});
		return parseJsonResponse(res);
	},
	getCampaignProfile: async (id: string) => {
		const res = await authFetch(`/campaigns/${id}/profile`);
		return parseJsonResponse(res);
	},
	researchCampaign: async (data: {
		brand_url: string;
		name?: string;
		category?: string;
		brief?: string;
	}) => {
		const res = await authFetch('/campaigns/research', {
			method: 'POST',
			body: JSON.stringify(data),
		});
		return parseJsonResponse(res);
	},

	getCampaigns: async () => {
		const res = await authFetch('/campaigns');
		return parseJsonResponse(res);
	},
	getCampaign: async (id: string) => {
		const res = await authFetch(`/campaigns/${id}`);
		return parseJsonResponse(res);
	},
	setCampaignStatus: async (id: string, active: boolean) => {
		const res = await authFetch(`/campaigns/${id}/status`, {
			method: 'PATCH',
			body: JSON.stringify({ active }),
		});
		return parseJsonResponse(res);
	},
	createCampaign: async (data: Record<string, unknown>) => {
		const res = await authFetch('/campaigns', {
			method: 'POST',
			body: JSON.stringify(data),
		});
		return parseJsonResponse(res);
	},
	updateCampaign: async (id: string, data: Record<string, unknown>) => {
		const res = await authFetch(`/campaigns/${id}`, {
			method: 'PUT',
			body: JSON.stringify(data),
		});
		return parseJsonResponse(res);
	},
	refreshCampaignEmbedding: async (id: string) => {
		const res = await authFetch(`/campaigns/${id}/refresh-embedding`, {
			method: 'POST',
		});
		return parseJsonResponse(res);
	},
	deleteCampaign: async (id: string) => {
		const res = await authFetch(`/campaigns/${id}`, { method: 'DELETE' });
		return parseJsonResponse(res);
	},
	getCampaignDashboard: async (id: string) => {
		const res = await authFetch(`/dashboard/${id}`);
		return parseJsonResponse(res);
	},

	getAgents: async () => {
		const res = await authFetch('/agents/');
		return parseJsonResponse(res);
	},
	registerAgent: async (data: { username: string; owner_email: string }) => {
		const res = await authFetch('/agents/register', {
			method: 'POST',
			body: JSON.stringify(data),
		});
		return parseJsonResponse(res);
	},
	updateAgent: async (
		id: string,
		data: { active?: boolean; username?: string }
	) => {
		const res = await authFetch(`/agents/${id}`, {
			method: 'PATCH',
			body: JSON.stringify(data),
		});
		return parseJsonResponse(res);
	},
	deleteAgent: async (id: string) => {
		const res = await authFetch(`/agents/${id}`, { method: 'DELETE' });
		return parseJsonResponse(res);
	},
	getAgentStats: async (username: string) => {
		const res = await authFetch(`/agents/${username}/stats`);
		return parseJsonResponse(res);
	},

	enrich: async (
		prompt: string,
		options?: {
			answerOnly?: boolean;
			messages?: { role: string; content: string }[];
			sessionId?: string;
			parseMode?: 'Markdown' | 'HTML';
		}
	) => {
		const res = await safeFetch(`${API_BASE}/enrich`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				prompt,
				answer_only: options?.answerOnly ?? false,
				messages: options?.messages ?? [],
				session_id: options?.sessionId,
				parse_mode: options?.parseMode ?? 'Markdown',
			}),
		});
		return parseJsonResponse(res);
	},
	sendResult: async (
		prompt: string,
		apiKey: string,
		options?: { messages?: { role: string; content: string }[] }
	) => {
		const res = await safeFetch(`${AUTH_BASE}/send_result`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				prompt,
				api_key: apiKey,
				messages: options?.messages ?? [],
			}),
		});
		if (!res.ok) return { match: false };
		const data = await res.json();
		if (!data.match) return { match: false };
		return data;
	},

	getChatSessions: async (limit = 50, intentType?: string) => {
		let url = `${API_BASE}/sessions?limit=${limit}`;
		if (intentType) url += `&intent_type=${intentType}`;
		const res = await safeFetch(url);
		return parseJsonResponse(res);
	},

	clearCache: async () => {
		const res = await safeFetch(`${API_BASE}/cache/clear`, { method: 'POST' });
		return parseJsonResponse(res);
	},
};
