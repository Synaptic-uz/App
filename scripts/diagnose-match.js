import crypto from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = crypto;

import { connectDB, Campaign, Agent } from '../db.js';
import { hashApiKey } from '../agentAuth.js';
import { findBestCampaign, findMatchingCandidates } from '../campaignMatcher.js';
import { bulkLoadCtr } from '../adRanking.js';

await connectDB();

const all = await Campaign.find({}).select('+embedding').lean();
const active1 = await Campaign.find({ active: 1 }).select('+embedding').lean();
const agent = await Agent.findOne({ api_key_hash: hashApiKey('sk-synaptic-demo') });

bulkLoadCtr(
  active1.map((c) => ({
    _id: c._id,
    impressions: c.stats_impressions || 0,
    clicks: c.stats_clicks || 0,
  }))
);

const prompts = [
  'I want to buy a new iPhone 15 Pro',
  'Kofe ichmoqchi edim',
  'sayohat qilish uchun qayerga borsam boladi',
];

console.log('=== DIAGNOSE (hybrid ranking) ===');
console.log('campaigns total:', all.length);
console.log('campaigns active=1:', active1.length);
console.log('demo agent:', agent ? agent.username : 'MISSING');

const pool = active1.length ? active1 : all;
const ctx = { agentId: agent?.username || 'demo' };

for (const prompt of prompts) {
  const { candidates, dominantTopic } = await findMatchingCandidates(prompt, pool);
  console.log('\nprompt:', prompt);
  console.log('  topic:', dominantTopic);
  console.log('  pool:', candidates.map((c) => `${c.campaign.name} (rel=${c.relevance.toFixed(2)}, cpc=${c.campaign.cpc_rate})`).join(' | ') || 'none');

  const runs = {};
  for (let i = 0; i < 12; i++) {
    const m = await findBestCampaign(prompt, pool, { servingContext: ctx });
    const name = m.campaign?.name ?? 'none';
    runs[name] = (runs[name] || 0) + 1;
  }
  console.log('  12 picks:', runs);
}

process.exit(0);
