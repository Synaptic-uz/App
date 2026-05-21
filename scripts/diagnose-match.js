import crypto from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = crypto;

import { connectDB, Campaign, Agent } from '../db.js';
import { hashApiKey } from '../agentAuth.js';
import { findBestCampaign } from '../campaignMatcher.js';

await connectDB();

const all = await Campaign.find({}).select('+embedding').lean();
const active1 = await Campaign.find({ active: 1 }).select('+embedding').lean();
const agent = await Agent.findOne({ api_key_hash: hashApiKey('sk-synaptic-demo') });

const prompts = [
  'I want to buy a new iPhone 15 Pro',
  'Kofe ichmoqchi edim',
  'sayohat qilish uchun qayerga borsam boladi',
];

console.log('=== DIAGNOSE ===');
console.log('campaigns total:', all.length);
console.log('campaigns active=1:', active1.length);
console.log('demo agent:', agent ? agent.username : 'MISSING');

for (const prompt of prompts) {
  const m = await findBestCampaign(prompt, active1.length ? active1 : all);
  console.log('\nprompt:', prompt);
  console.log('  method:', m.method);
  console.log('  score:', m.score);
  console.log('  campaign:', m.campaign?.name ?? 'none');
  console.log('  topic:', m.dominantTopic);
}

process.exit(0);
