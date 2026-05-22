/**
 * Run from project root (loads .env via dotenv):
 *   node scripts/audit-match-setup.mjs
 *
 * Paste scripts/audit-match-result.txt back to the agent if you want help interpreting.
 */
import 'dotenv/config';
import crypto from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = crypto;

import fs from 'node:fs';
import { connectDB, Campaign, campaignHasBudgetRemaining } from '../db.js';
import { findMatchingCandidates, findBestCampaign } from '../campaignMatcher.js';
import { embedText } from '../embeddings.js';
import { loadCampaignCache, invalidateCampaignCache } from '../enrichment.js';

const out = [];
const log = (...a) => {
  const line = a.join(' ');
  out.push(line);
  console.log(line);
};

const DISCOVERY_WORDS = ['marketplace', 'marketplaces', "onlayn do'kon", 'internet do', 'xarid'];

function maskEnv() {
  const hasEnvFile = fs.existsSync('.env');
  const token = process.env.GITHUB_TOKEN;
  const mongo = process.env.MONGODB_URI;
  log('STEP 1 — .env / env vars');
  log(`  .env file on disk: ${hasEnvFile ? 'YES' : 'NO'}`);
  if (!hasEnvFile) {
    log('  ACTION: create .env in project root (same folder as server.js)');
  }
  log(`  GITHUB_TOKEN loaded: ${token ? `YES (${token.length} chars)` : 'NO — embeddings disabled'}`);
  if (!token) {
    log('  ACTION: add GITHUB_TOKEN=... to .env (GitHub Models / inference token)');
  }
  log(`  MONGODB_URI loaded: ${mongo ? 'YES' : 'NO (defaults to mongodb://localhost:27017/synaptic-ai)'}`);
  log(`  VERDICT: ${hasEnvFile && token ? 'PASS' : 'FAIL or partial — fix .env'}`);
}

async function checkEmbeddings() {
  log('\nSTEP 2 — embedding API (GITHUB_TOKEN must work at runtime)');
  if (!process.env.GITHUB_TOKEN) {
    log('  SKIP: no GITHUB_TOKEN');
    log('  VERDICT: FAIL — matcher uses keywords/tagline only');
    return false;
  }
  try {
    const v = await embedText('marketplace test');
    const ok = Boolean(v?.length);
    log(`  embedText OK: vector length ${v?.length ?? 0}`);
    log(`  VERDICT: ${ok ? 'PASS' : 'FAIL'}`);
    return ok;
  } catch (e) {
    log(`  embedText FAILED: ${e.message}`);
    log('  ACTION: check token scope / network; restart server after fixing .env');
    log('  VERDICT: FAIL');
    return false;
  }
}

async function checkCampaigns() {
  log('\nSTEP 3 — active campaigns + keyword coverage');
  const all = await Campaign.find({}).select('+embedding').lean();
  const active = all.filter((c) => c.active !== 0 && c.active !== false);
  log(`  total: ${all.length}, active: ${active.length}`);

  let keywordGap = false;
  let missingEmb = false;
  let budgetBlock = false;

  for (const c of active) {
    const budgetOk = campaignHasBudgetRemaining(c);
    const emb = Boolean(c.embedding?.length);
    const kws = (c.keywords || []).map((k) => k.toLowerCase());
    const hasDiscoveryKw = DISCOVERY_WORDS.some((w) =>
      kws.some((k) => k.includes(w) || w.includes(k))
    );

    log(`\n  [${c.name}] tracking=${c.tracking_code}`);
    log(`    category=${c.category} keywords=${JSON.stringify(c.keywords || [])}`);
    log(`    tagline=${(c.tagline || '').slice(0, 80)}`);
    log(`    cpc=${c.cpc_rate} budget=${c.budget} spent=${c.spent} budget_ok=${budgetOk}`);
    log(`    embedding=${emb ? `yes (${c.embedding.length})` : 'MISSING'}`);
    log(`    discovery keywords (marketplace/onlayn/xarid): ${hasDiscoveryKw ? 'YES' : 'NO'}`);

    if (!hasDiscoveryKw) keywordGap = true;
    if (!emb && process.env.GITHUB_TOKEN) missingEmb = true;
    if (!budgetOk) budgetBlock = true;
  }

  log('\n  STEP 3 notes:');
  if (keywordGap) {
    log('  - At least one active campaign lacks discovery words in keywords[]');
    log('  ACTION: edit campaign — add words users actually type (e.g. marketplace, onlayn do\'kon, xarid)');
  }
  if (missingEmb) {
    log('  - TOKEN is set but some campaigns have no embedding — re-save campaign or restart seed');
    log('  ACTION: PUT /api/campaigns/:id (any field) or set GITHUB_TOKEN before create');
  }
  if (budgetBlock) {
    log('  - Some campaigns blocked by budget < one CPC');
    log('  ACTION: add budget or lower cpc_rate');
  }
  log(`  VERDICT: ${!keywordGap && !budgetBlock ? 'PASS (data looks matchable)' : 'NEEDS YOUR INPUT on campaigns above'}`);

  return active.filter(campaignHasBudgetRemaining);
}

async function checkMatching(pool, prompts) {
  log('\nSTEP 4 — matcher pool (who passes relevance >= 0.2)');
  let anyPass = false;
  for (const prompt of prompts) {
    const { candidates, method } = await findMatchingCandidates(prompt, pool);
    log(`\n  prompt: "${prompt}"`);
    log(`    method=${method} candidates=${candidates.length}`);
    if (candidates.length === 0) {
      log('    → nobody passed — usually missing keywords in prompt language');
      continue;
    }
    anyPass = true;
    for (const x of [...candidates].sort((a, b) => b.relevance - a.relevance)) {
      log(
        `    • ${x.campaign.name}: rel=${x.relevance.toFixed(3)} kw=${x.keywordMatches} tag=${(x.taglineScore ?? 0).toFixed(2)} vec=${(x.vectorScore ?? 0).toFixed(2)}`
      );
    }
  }
  log(`\n  VERDICT: ${anyPass ? 'PASS — some prompts match' : 'FAIL — no campaign reaches 0.2 for test prompts'}`);
  return anyPass;
}

async function checkRanking(pool, prompt) {
  log('\nSTEP 5 — ranking (12 random picks — not the only winner)');
  const picks = {};
  for (let i = 0; i < 12; i++) {
    const m = await findBestCampaign(prompt, pool, {
      servingContext: { agentId: 'audit' },
      recordServe: false,
    });
    const name = m.campaign?.name ?? 'none';
    picks[name] = (picks[name] || 0) + 1;
  }
  log(`  prompt: "${prompt}"`);
  log(`  picks: ${JSON.stringify(picks)}`);
  const names = Object.keys(picks).filter((k) => k !== 'none');
  if (names.length === 0) {
    log('  VERDICT: N/A — no candidates (fix Step 4 first)');
  } else if (names.length === 1) {
    log(`  VERDICT: PASS — only ${names[0]} in pool for this prompt`);
  } else {
    log('  VERDICT: OK — multiple in pool; auction may rotate (raise cpc or relevance)');
  }
}

async function checkCache(active) {
  log('\nSTEP 6 — enrich cache (fixed: create/update now invalidates cache)');
  invalidateCampaignCache();
  const loaded = await loadCampaignCache();
  log(`  cache campaigns: ${loaded.length}`);
  log(`  DB active (budget-ok): ${active.filter(campaignHasBudgetRemaining).length}`);
  log(`  names: ${loaded.map((c) => c.name).join(', ') || '(empty)'}`);
  log('  VERDICT: PASS if your new campaign name appears above after create');
}

const prompts = [
  'best marketplaces in uzbekistan',
  'marketplace tavsiya qiling',
  "onlayn do'konlar qaysi yaxshi",
  'I want to buy a new iPhone 15 Pro',
];

try {
  maskEnv();
  await connectDB();
  await checkEmbeddings();
  const pool = await checkCampaigns();
  await checkMatching(pool, prompts);
  await checkRanking(pool, 'best marketplaces in uzbekistan');
  await checkCache(pool);
  log('\n=== DONE — share audit-match-result.txt if anything FAILs ===');
} catch (e) {
  log(`\nFATAL: ${e.stack || e.message}`);
  log('ACTION: is MongoDB running? mongosh or docker as you usually start it');
}

fs.writeFileSync('scripts/audit-match-result.txt', out.join('\n'));
