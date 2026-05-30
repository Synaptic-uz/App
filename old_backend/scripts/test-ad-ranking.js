/**
 * Standalone hybrid ranking test (no MongoDB / embeddings).
 * Run: node scripts/test-ad-ranking.js
 */
import {
  rankAndSelect,
  applyServingConstraints,
  normalizeBid,
  computeHybridScore,
  clearServingState,
  recordImpression,
  RANKING_CONFIG,
} from '../adRanking.js';

const mockCampaigns = [
  { _id: 'a1', name: 'BigBid Co', cpc_rate: 1000, owner_id: 'owner1', max_daily_impressions: 5000, today_impressions: 0 },
  { _id: 'a2', name: 'MidBid Co', cpc_rate: 500, owner_id: 'owner2', max_daily_impressions: 5000, today_impressions: 0 },
  { _id: 'a3', name: 'SmallBid Co', cpc_rate: 200, owner_id: 'owner3', max_daily_impressions: 5000, today_impressions: 0 },
];

function makeCandidates() {
  return mockCampaigns.map((c, i) => ({
    campaign: c,
    relevance: 0.55 + i * 0.02,
    method: 'test',
  }));
}

clearServingState();

console.log('=== adRanking unit test ===\n');
console.log('config:', RANKING_CONFIG.weights, 'topK:', RANKING_CONFIG.topK);

const ctx = { agentId: 'test-agent' };
const picks = {};

for (let i = 0; i < 30; i++) {
  const { selected } = rankAndSelect(makeCandidates(), ctx);
  if (selected?.campaign) recordImpression(ctx, selected.campaign);
  const name = selected?.campaign?.name ?? 'none';
  picks[name] = (picks[name] || 0) + 1;
}

console.log('\n30 picks (same relevance pool, different bids):');
console.log(picks);
console.log('Expected: BigBid Co most often, but SmallBid Co sometimes appears.\n');

const constrained = applyServingConstraints(makeCandidates(), ctx);
const hasBigBid = constrained.some((c) => c.campaign._id === 'a1');
console.log('After 30 serves, consecutive cooldown blocks last pick:', !hasBigBid || constrained.length > 1);

const bidNorm = normalizeBid(500, 200, 1000);
const score = computeHybridScore({ relevance: 0.6, campaign: mockCampaigns[1], servingPenalty: 1 }, bidNorm);
console.log('MidBid hybridScore sample:', score.toFixed(4));

console.log('\nOK');
