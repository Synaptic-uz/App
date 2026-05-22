import 'dotenv/config';
import crypto from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = crypto;

import express from 'express';
import cors from 'cors';
import {
  connectDB,
  Campaign,
  Event,
  Agent,
  Session,
  User,
  incrementCampaignImpression,
  bootstrapRankingStats,
} from './db.js';
import { bulkLoadCtr, recordClick, clearServingState } from './adRanking.js';
import { enrichResponse, loadCampaignCache } from './enrichment.js';
import { nanoid } from 'nanoid';
import { embedText } from './embeddings.js';
import { findBestCampaign } from './campaignMatcher.js';
import { getCategoryOptions, buildCampaignProfileText, defaultSubcategory, displayCategory } from './categories.js';
import { agentAuth, hashApiKey, generateApiKey } from './agentAuth.js';
import {
  buildSuggestion,
  buildCtaLabel,
  buildTrackingUrl,
  buildDisplayPath,
  formatSponsoredAppend,
  isCampaignServeReady,
} from './suggestion.js';
import { generateToken, authenticateToken, hashPassword, comparePassword } from './auth.js';

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json());

// --- Auth Endpoints ---

app.post('/api/auth/register', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) return res.status(400).json({ error: 'Missing fields' });

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await hashPassword(password);
    const user = await User.create({ email, password: hashedPassword, role });

    const token = generateToken(user);
    res.json({ token, user: { email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({ token, user: { email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// --- Analytics Cache ---
let analyticsCache = { data: null, timestamp: 0 };
const ANALYTICS_CACHE_TTL = 10000;

async function getCachedAnalytics() {
  if (analyticsCache.data && Date.now() - analyticsCache.timestamp < ANALYTICS_CACHE_TTL) {
    return analyticsCache.data;
  }

  const campaigns = await Campaign.find().lean();
  const campaignIds = campaigns.map(c => c._id);

  const stats = await Event.aggregate([
    { $match: { campaign_id: { $in: campaignIds } } },
    { $group: { _id: { campaign_id: "$campaign_id", type: "$type" }, count: { $sum: 1 } } }
  ]);

  let totalImpressions = 0, totalClicks = 0, totalConversions = 0;
  const campaignStatsMap = {};

  for (const c of campaigns) {
    campaignStatsMap[c._id.toString()] = {
      id: c._id, name: c.name, category: c.category,
      impressions: 0, clicks: 0, conversions: 0,
      cpc_rate: c.cpc_rate, cpa_percentage: c.cpa_percentage,
      budget: c.budget, spent: c.spent,
    };
  }

  for (const stat of stats) {
    if (!stat._id.campaign_id) continue;
    const cid = stat._id.campaign_id.toString();
    if (!campaignStatsMap[cid]) continue;

    if (stat._id.type === 'impression') { campaignStatsMap[cid].impressions += stat.count; totalImpressions += stat.count; }
    else if (stat._id.type === 'click') { campaignStatsMap[cid].clicks += stat.count; totalClicks += stat.count; }
    else if (stat._id.type === 'conversion') { campaignStatsMap[cid].conversions += stat.count; totalConversions += stat.count; }
  }

  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  const result = {
    campaigns: Object.values(campaignStatsMap),
    overview: { totalImpressions, totalClicks, totalConversions, ctr: ctr.toFixed(2) + '%', conversion_rate: conversionRate.toFixed(2) + '%' },
  };

  analyticsCache = { data: result, timestamp: Date.now() };
  return result;
}

// --- Core Endpoints ---

app.post('/api/enrich', async (req, res) => {
  const { prompt, answer_only } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  try {
    const result = await enrichResponse(prompt, null, { answerOnly: !!answer_only });
    res.json(result);
  } catch (error) {
    console.error('Enrich error:', error);
    res.status(500).json({ error: 'Failed to enrich response' });
  }
});

// --- Production B2B Endpoint for AI Agents ---

app.post('/authorized/send_result', agentAuth, async (req, res) => {
  const { prompt } = req.body;
  const agent = req.agent;

  if (!prompt) return res.json({ match: false });

  try {
    const activeCampaigns = await Campaign.find({
      active: { $in: [1, true] },
    })
      .select('+embedding name tracking_code brand_url link_text keywords niche_keywords custom_category subcategory category tagline description')
      .lean();

    const matchResult = await findBestCampaign(prompt, activeCampaigns, {
      servingContext: { agentId: agent.username },
    });
    const { campaign: bestCampaign, method: matchMethod } = matchResult;

    if (!bestCampaign || !isCampaignServeReady(bestCampaign)) {
      if (bestCampaign && !isCampaignServeReady(bestCampaign)) {
        console.warn(`[send_result] matched campaign incomplete: ${bestCampaign.tracking_code || bestCampaign._id}`);
      } else {
        console.log(
          `[send_result] no match | method=${matchMethod} | campaigns=${activeCampaigns.length} | prompt="${prompt.substring(0, 80)}"`
        );
      }
      return res.json({ match: false });
    }

    {
      const suggestion = buildSuggestion(bestCampaign);
      const cta_label = buildCtaLabel(bestCampaign);
      const tracking_url = buildTrackingUrl(req, bestCampaign.tracking_code, agent.username);
      if (!tracking_url) return res.json({ match: false });

      Event.create({
        campaign_id: bestCampaign._id,
        agent_id: agent.username,
        type: 'impression',
        user_prompt: prompt.substring(0, 500),
      }).catch(() => {});

      incrementCampaignImpression(bestCampaign._id, bestCampaign.cpc_rate || 0).catch(() => {});
      Agent.updateOne({ _id: agent._id }, { $inc: { total_impressions: 1 } }).catch(() => {});

      return res.json({
        match: true,
        intent: bestCampaign.category,
        suggestion,
        sponsored_line: formatSponsoredAppend(suggestion, cta_label),
        cta_label,
        tracking_url,
        display_path: buildDisplayPath(bestCampaign.tracking_code),
        campaign: {
          name: bestCampaign.name,
          category: bestCampaign.category,
          category_label: displayCategory(bestCampaign),
          link_text: bestCampaign.link_text,
          brand_url: bestCampaign.brand_url,
        },
      });
    }

  } catch (error) {
    console.error('B2B Query Error:', error);
    return res.json({ match: false });
  }
});

// --- Agent Registration ---

app.post('/api/agents/register', authenticateToken, async (req, res) => {
  const { username, owner_email } = req.body;

  if (req.user.role !== 'agent') {
    return res.status(403).json({ error: 'Only agent accounts can register API keys' });
  }

  if (!username || !owner_email) {
    return res.status(400).json({ error: 'Username and owner_email are required' });
  }

  try {
    const existing = await Agent.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already taken' });

    const api_key = generateApiKey();
    const api_key_hash = hashApiKey(api_key);

    await Agent.create({ 
      username, 
      owner_email, 
      api_key_hash,
      owner_id: req.user.id 
    });

    res.json({
      message: 'Agent registered. Store your API key — it will not be shown again.',
      api_key
    });
  } catch (error) {
    console.error('Agent Registration Error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// --- Agent List & Stats ---

app.get('/api/agents', authenticateToken, async (req, res) => {
  try {
    const query = req.user.role === 'agent' ? { owner_id: req.user.id } : {};
    const agents = await Agent.find(query).sort({ total_clicks: -1 }).lean();
    res.json(agents.map(a => ({
      ...a,
      api_key_hash: undefined,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

app.get('/api/agents/:username/stats', authenticateToken, async (req, res) => {
  const { username } = req.params;
  try {
    const agent = await Agent.findOne({ username }).lean();
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    // Enforce ownership
    if (agent.owner_id && agent.owner_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to this agent' });
    }

    const [events, dailyStats] = await Promise.all([
      Event.aggregate([
        { $match: { agent_id: username } },
        { $group: { _id: "$type", count: { $sum: 1 } } }
      ]),
      Event.aggregate([
        { $match: { agent_id: username, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, type: "$type" }, count: { $sum: 1 } } },
        { $sort: { "_id.date": 1 } }
      ])
    ]);

    let impressions = 0, clicks = 0;
    for (const e of events) {
      if (e._id === 'impression') impressions += e.count;
      if (e._id === 'click') clicks += e.count;
    }

    const formattedDaily = {};
    for (const d of dailyStats) {
      if (!formattedDaily[d._id.date]) formattedDaily[d._id.date] = { date: d._id.date, impressions: 0, clicks: 0 };
      if (d._id.type === 'impression') formattedDaily[d._id.date].impressions += d.count;
      if (d._id.type === 'click') formattedDaily[d._id.date].clicks += d.count;
    }

    res.json({
      agent: { ...agent, api_key_hash: undefined },
      totals: { impressions, clicks, ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) + '%' : '0%' },
      daily_stats: Object.values(formattedDaily),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agent stats' });
  }
});

// --- Tracking Link ---

app.get('/t/:code', async (req, res) => {
  const { code } = req.params;
  const agentId = req.query.a;

  try {
    const campaign = await Campaign.findOne({ tracking_code: code, active: { $in: [1, true] } })
      .select('_id brand_url cpc_rate')
      .lean();
    const dest = campaign?.brand_url?.trim();
    if (campaign && dest && /^https?:\/\//i.test(dest)) {
      Event.create({
        campaign_id: campaign._id,
        agent_id: agentId || null,
        type: 'click'
      }).catch(() => {});

      recordClick(campaign._id);
      Campaign.updateOne({ _id: campaign._id }, { $inc: { stats_clicks: 1 } }).catch(() => {});

      if (agentId) {
        Agent.updateOne({ username: agentId }, { $inc: { total_clicks: 1 } }).catch(() => {});
      }

      return res.redirect(dest);
    }
    res.status(404).send('Invalid tracking link');
  } catch (error) {
    res.status(500).send('Server Error');
  }
});

// --- Conversion Tracking ---

app.post('/api/conversion', async (req, res) => {
  const { session_id, campaign_id, conversion_value, metadata } = req.body;
  if (!session_id || !campaign_id) return res.status(400).json({ error: 'session_id and campaign_id required' });

  try {
    const campaign = await Campaign.findById(campaign_id).select('cpa_percentage cpa_rate').lean();
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const cpaAmount = conversion_value ? (conversion_value * campaign.cpa_percentage) / 100 : campaign.cpa_rate;

    await Event.create({ campaign_id, type: 'conversion', session_id, conversion_value: conversion_value || 0, metadata: { ...metadata, cpa_earned: cpaAmount } });
    Campaign.findByIdAndUpdate(campaign_id, { $inc: { spent: cpaAmount } }).catch(() => {});

    res.json({ success: true, cpa_earned: cpaAmount, cpa_percentage: campaign.cpa_percentage });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

// --- Analytics ---

app.get('/api/analytics', async (req, res) => {
  try {
    const data = await getCachedAnalytics();
    res.json(data);
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/intent-stats', async (req, res) => {
  try {
    const [intentStats, hourlyIntent, topCategories] = await Promise.all([
      Session.aggregate([
        { $group: { _id: "$intent_type", count: { $sum: 1 }, enriched_count: { $sum: { $cond: ["$enriched", 1, 0] } }, avg_similarity: { $avg: "$similarity_score" } } }
      ]),
      Session.aggregate([
        { $group: { _id: { hour: { $hour: "$createdAt" }, intent: "$intent_type" }, count: { $sum: 1 } } },
        { $sort: { "_id.hour": 1 } }
      ]),
      Session.aggregate([
        { $match: { matched_campaign_id: { $ne: null } } },
        { $lookup: { from: "campaigns", localField: "matched_campaign_id", foreignField: "_id", as: "campaign" } },
        { $unwind: "$campaign" },
        { $group: { _id: "$campaign.category", count: { $sum: 1 }, avg_score: { $avg: "$similarity_score" } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({ intent_distribution: intentStats, hourly_pattern: hourlyIntent, top_categories: topCategories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch intent stats' });
  }
});

// --- B2B Campaign Dashboard ---

app.get('/api/dashboard/:campaignId', authenticateToken, async (req, res) => {
  const { campaignId } = req.params;
  try {
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Enforce ownership
    if (campaign.owner_id && campaign.owner_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to this campaign' });
    }

    const [events, dailyStats] = await Promise.all([
      Event.aggregate([
        { $match: { campaign_id: campaign._id } },
        { $group: { _id: "$type", count: { $sum: 1 } } }
      ]),
      Event.aggregate([
        { $match: { campaign_id: campaign._id, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, type: "$type" }, count: { $sum: 1 } } },
        { $sort: { "_id.date": 1 } }
      ])
    ]);

    let totalImpressions = 0, totalClicks = 0, totalConversions = 0;
    for (const e of events) {
      if (e._id === 'impression') totalImpressions += e.count;
      if (e._id === 'click') totalClicks += e.count;
      if (e._id === 'conversion') totalConversions += e.count;
    }

    const formattedDaily = {};
    for (const d of dailyStats) {
      if (!formattedDaily[d._id.date]) formattedDaily[d._id.date] = { date: d._id.date, impressions: 0, clicks: 0, conversions: 0 };
      if (d._id.type === 'impression') formattedDaily[d._id.date].impressions += d.count;
      if (d._id.type === 'click') formattedDaily[d._id.date].clicks += d.count;
      if (d._id.type === 'conversion') formattedDaily[d._id.date].conversions += d.count;
    }

    res.json({
      campaign: {
        id: campaign._id, name: campaign.name, category: campaign.category, brand_url: campaign.brand_url,
        tracking_code: campaign.tracking_code, cpc_rate: campaign.cpc_rate, cpa_percentage: campaign.cpa_percentage,
        budget: campaign.budget, spent: campaign.spent, budget_remaining: campaign.budget - campaign.spent, source: campaign.source,
      },
      totals: {
        impressions: totalImpressions, clicks: totalClicks, conversions: totalConversions,
        ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + '%' : '0%',
        conversion_rate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) + '%' : '0%',
      },
      daily_stats: Object.values(formattedDaily),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// --- Campaign CRUD ---

app.get('/api/categories', (_req, res) => {
  res.json(getCategoryOptions());
});

app.get('/api/campaigns', authenticateToken, async (req, res) => {
  try {
    const query = req.user.role === 'business' ? { owner_id: req.user.id } : {};
    const campaigns = await Campaign.find(query).select('-embedding').sort({ createdAt: -1 }).lean();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

app.post('/api/campaigns', authenticateToken, async (req, res) => {
  if (req.user.role !== 'business') {
    return res.status(403).json({ error: 'Only business accounts can create campaigns' });
  }

  const {
    name, category, subcategory, custom_category, brand_url, link_text, tagline, description,
    keywords, niche_keywords, cpc_rate, cpa_percentage, tone, budget,
  } = req.body;
  const tracking_code = nanoid(10);

  if (!name || !category || !brand_url) {
    return res.status(400).json({ error: 'Name, category, and brand URL are required' });
  }

  if (category === 'other' && !custom_category?.trim()) {
    return res.status(400).json({ error: 'Please describe your category when using Other' });
  }

  const kwList = Array.isArray(keywords) ? keywords.filter(Boolean) : [];
  if (kwList.length === 0) {
    return res.status(400).json({ error: 'At least one keyword is required for matching' });
  }

  const sub = subcategory || defaultSubcategory(category);

  try {
    const profile = {
      name, category, subcategory: sub, custom_category: custom_category?.trim() || '',
      tagline, description,
      keywords: kwList, niche_keywords: niche_keywords || [],
    };
    const embedding = await embedText(buildCampaignProfileText(profile));

    const campaign = await Campaign.create({
      name, category, subcategory: sub,
      custom_category: custom_category?.trim() || '',
      brand_url,
      link_text: link_text || name, tagline: tagline || '', tracking_code, embedding,
      description: description || '', keywords: kwList,
      niche_keywords: niche_keywords || [],
      cpc_rate: cpc_rate || 0, cpa_percentage: cpa_percentage || 0,
      tone: tone || 'informative', budget: budget || 0, source: 'partner',
      owner_id: req.user.id,
      active: 1,
    });

    loadCampaignCache();
    res.json({ id: tracking_code, _id: campaign._id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

app.put('/api/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, owner_id: req.user.id });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found or unauthorized' });
    
    const fields = ['name', 'category', 'subcategory', 'custom_category', 'tagline', 'description', 'keywords', 'niche_keywords'];
    for (const f of fields) {
      if (req.body[f] !== undefined) campaign[f] = req.body[f];
    }
    if (process.env.GITHUB_TOKEN) {
      campaign.embedding = await embedText(buildCampaignProfileText(campaign));
    }
    await campaign.save();

    loadCampaignCache();
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

app.delete('/api/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    const result = await Campaign.deleteOne({ _id: req.params.id, owner_id: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Campaign not found or unauthorized' });
    
    loadCampaignCache();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

app.get('/api/sessions', async (req, res) => {
  const { limit = 50, intent_type } = req.query;
  try {
    const query = {};
    if (intent_type) query.intent_type = intent_type;
    const sessions = await Session.find(query).sort({ createdAt: -1 }).limit(parseInt(limit)).lean();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// --- Cache Invalidation ---
app.post('/api/cache/clear', async (req, res) => {
  analyticsCache = { data: null, timestamp: 0 };
  clearServingState();
  await loadCampaignCache();
  await bootstrapRankingStats(bulkLoadCtr);
  res.json({ success: true });
});

connectDB().then(async () => {
  loadCampaignCache();
  await bootstrapRankingStats(bulkLoadCtr);
  const campaignCount = await Campaign.countDocuments({ active: { $in: [1, true] } });
  const demoAgent = await Agent.findOne({ username: 'demo-telegram-bot' });
  console.log(`Active campaigns: ${campaignCount} | Demo agent: ${demoAgent ? 'ok' : 'MISSING'}`);
  app.listen(PORT, () => {
    console.log(`Synaptic AI(SI) Backend running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Cannot start — MongoDB required:', err.message || err);
  process.exit(1);
});
