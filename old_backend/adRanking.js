/**
 * Hybrid ad ranking: weighted relevance + bid + CTR + controlled randomness.
 * Top-k weighted selection, frequency caps, consecutive-advertiser cooldown.
 */

/** @typedef {{ campaign: object, relevance: number, keywordMatches?: number, vectorScore?: number, campaignTopic?: string, method?: string }} RankCandidate */

export const RANKING_CONFIG = {
  weights: {
    bid: Number(process.env.AD_WEIGHT_BID) || 0.4,
    relevance: Number(process.env.AD_WEIGHT_RELEVANCE) || 0.3,
    ctr: Number(process.env.AD_WEIGHT_CTR) || 0.2,
    randomness: Number(process.env.AD_WEIGHT_RANDOM) || 0.1,
  },
  topK: Number(process.env.AD_TOP_K) || 5,
  /** Hard block: same campaign cannot repeat back-to-back for this context */
  consecutiveCooldown: true,
  /** Soft cap: penalize campaigns shown often in recent window */
  recentWindowSize: Number(process.env.AD_RECENT_WINDOW) || 8,
  maxSameCampaignInWindow: Number(process.env.AD_MAX_SAME_IN_WINDOW) || 2,
  maxSameOwnerInWindow: Number(process.env.AD_MAX_OWNER_IN_WINDOW) || 4,
  defaultCtr: 0.05,
  minCtr: 0.01,
  maxCtr: 0.25,
};

const servingState = new Map();
const ctrByCampaign = new Map();

function stateKey(context) {
  if (!context) return 'global';
  if (typeof context === 'string') return context;
  if (context.agentId) return `agent:${context.agentId}`;
  if (context.sessionId) return `session:${context.sessionId}`;
  return 'global';
}

function getServingState(key) {
  if (!servingState.has(key)) {
    servingState.set(key, {
      lastCampaignId: null,
      recentCampaignIds: [],
      recentOwnerIds: [],
    });
  }
  return servingState.get(key);
}

export function normalizeBid(cpc, minCpc, maxCpc) {
  if (!cpc || cpc <= 0) return 0;
  if (maxCpc <= minCpc) return 0.5;
  return Math.min(1, Math.max(0, (cpc - minCpc) / (maxCpc - minCpc)));
}

export function getCampaignCtr(campaignId) {
  const id = String(campaignId);
  if (ctrByCampaign.has(id)) return ctrByCampaign.get(id);
  return RANKING_CONFIG.defaultCtr;
}

export function setCampaignCtr(campaignId, impressions, clicks) {
  const id = String(campaignId);
  if (!impressions || impressions < 1) {
    ctrByCampaign.set(id, RANKING_CONFIG.defaultCtr);
    return;
  }
  const raw = clicks / impressions;
  const clamped = Math.min(RANKING_CONFIG.maxCtr, Math.max(RANKING_CONFIG.minCtr, raw));
  ctrByCampaign.set(id, clamped);
}

export function bulkLoadCtr(stats) {
  for (const row of stats || []) {
    const id = String(row._id);
    const imp = row.impressions || 0;
    const clk = row.clicks || 0;
    ctrByCampaign.set(`${id}:imp`, imp);
    ctrByCampaign.set(`${id}:clk`, clk);
    setCampaignCtr(row._id, imp, clk);
  }
}

/** Sync CTR from campaign documents (cache reload / DB bootstrap). */
export function syncCampaignStats(campaigns) {
  bulkLoadCtr(
    (campaigns || []).map((c) => ({
      _id: c._id,
      impressions: c.stats_impressions || 0,
      clicks: c.stats_clicks || 0,
    }))
  );
}

export function isWithinDailyCap(campaign) {
  const max = campaign.max_daily_impressions ?? 1000;
  const today = new Date().toDateString();
  const last = campaign.last_reset_date
    ? new Date(campaign.last_reset_date).toDateString()
    : today;
  if (last !== today) return true;
  return (campaign.today_impressions ?? 0) < max;
}

function countInRecent(list, value, limit) {
  let n = 0;
  for (let i = list.length - 1; i >= 0 && i >= list.length - limit; i--) {
    if (list[i] === value) n++;
  }
  return n;
}

/**
 * Filters and penalizes candidates before hybrid scoring.
 */
export function applyServingConstraints(candidates, context) {
  const key = stateKey(context);
  const state = getServingState(key);
  const cfg = RANKING_CONFIG;
  let pool = candidates.filter((c) => isWithinDailyCap(c.campaign));

  if (pool.length === 0) return [];

  if (cfg.consecutiveCooldown && state.lastCampaignId) {
    const withoutLast = pool.filter(
      (c) => String(c.campaign._id) !== String(state.lastCampaignId)
    );
    if (withoutLast.length > 0) pool = withoutLast;
  }

  const window = cfg.recentWindowSize;
  const penalized = pool.map((c) => {
    const cid = String(c.campaign._id);
    const ownerKey = c.campaign.owner_id ? String(c.campaign.owner_id) : cid;
    const sameCampaign = countInRecent(state.recentCampaignIds, cid, window);
    const sameOwner = countInRecent(state.recentOwnerIds, ownerKey, window);

    let penalty = 1;
    if (sameCampaign >= cfg.maxSameCampaignInWindow) penalty *= 0.15;
    else if (sameCampaign > 0) penalty *= Math.pow(0.55, sameCampaign);

    if (sameOwner >= cfg.maxSameOwnerInWindow) penalty *= 0.2;
    else if (sameOwner > 1) penalty *= Math.pow(0.75, sameOwner - 1);

    return { ...c, servingPenalty: penalty };
  });

  const viable = penalized.filter((c) => (c.servingPenalty ?? 1) > 0.05);
  return viable.length > 0 ? viable : penalized;
}

/**
 * Hybrid score in [0, ~1.1] — used for ordering and top-k weights.
 */
export function computeHybridScore(candidate, bidNorm, cfg = RANKING_CONFIG) {
  const w = cfg.weights;
  const relevance = Math.min(1, Math.max(0, candidate.relevance ?? 0));
  const ctr = getCampaignCtr(candidate.campaign._id);
  const randomness = Math.random();
  const penalty = candidate.servingPenalty ?? 1;

  const raw =
    w.bid * bidNorm +
    w.relevance * relevance +
    w.ctr * ctr +
    w.randomness * randomness;

  return Math.max(0.001, raw * penalty);
}

/**
 * Weighted random pick among top-k by hybrid score.
 */
export function selectTopKWeighted(scored, k = RANKING_CONFIG.topK) {
  if (!scored?.length) return null;
  const sorted = [...scored].sort((a, b) => b.hybridScore - a.hybridScore);
  const top = sorted.slice(0, Math.min(k, sorted.length));
  const total = top.reduce((s, x) => s + x.hybridScore, 0);
  if (total <= 0) return top[0];

  let r = Math.random() * total;
  for (const item of top) {
    r -= item.hybridScore;
    if (r <= 0) return item;
  }
  return top[top.length - 1];
}

/**
 * Full pipeline: constrain → score → top-k select.
 */
export function rankAndSelect(candidates, context) {
  const constrained = applyServingConstraints(candidates, context);
  if (constrained.length === 0) {
    return { selected: null, candidates: [], method: 'no-viable-candidates' };
  }

  const cpcs = constrained.map((c) => c.campaign.cpc_rate || 0);
  const minCpc = Math.min(...cpcs);
  const maxCpc = Math.max(...cpcs);

  const scored = constrained.map((c) => {
    const bidNorm = normalizeBid(c.campaign.cpc_rate || 0, minCpc, maxCpc);
    const hybridScore = computeHybridScore({ ...c, relevance: c.relevance }, bidNorm);
    return { ...c, bidNorm, hybridScore };
  });

  const picked = selectTopKWeighted(scored);
  return {
    selected: picked,
    candidates: scored,
    method: 'hybrid-topk',
  };
}

export function recordImpression(context, campaign) {
  if (!campaign) return;
  const key = stateKey(context);
  const state = getServingState(key);
  const cid = String(campaign._id);
  const ownerKey = campaign.owner_id ? String(campaign.owner_id) : cid;

  state.lastCampaignId = cid;
  state.recentCampaignIds.push(cid);
  state.recentOwnerIds.push(ownerKey);

  const max = RANKING_CONFIG.recentWindowSize * 2;
  if (state.recentCampaignIds.length > max) {
    state.recentCampaignIds = state.recentCampaignIds.slice(-max);
    state.recentOwnerIds = state.recentOwnerIds.slice(-max);
  }

  const statsId = cid;
  const prevImp = ctrByCampaign.get(`${statsId}:imp`) || 0;
  const prevClk = ctrByCampaign.get(`${statsId}:clk`) || 0;
  ctrByCampaign.set(`${statsId}:imp`, prevImp + 1);
  setCampaignCtr(campaign._id, prevImp + 1, prevClk);
}

export function recordClick(campaignId) {
  const id = String(campaignId);
  const imp = ctrByCampaign.get(`${id}:imp`) || 0;
  const clk = (ctrByCampaign.get(`${id}:clk`) || 0) + 1;
  ctrByCampaign.set(`${id}:clk`, clk);
  setCampaignCtr(campaignId, imp, clk);
}

export function clearServingState(contextKey) {
  if (contextKey) servingState.delete(contextKey);
  else servingState.clear();
}

/** Alias for callers expecting refreshCtrFromCampaigns. */
export const refreshCtrFromCampaigns = syncCampaignStats;
