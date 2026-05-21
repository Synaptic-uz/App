import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB, Campaign, Event, Agent, Session } from './db.js';
import { enrichResponse, loadCampaignCache } from './enrichment.js';
import { nanoid } from 'nanoid';
import { embedText, cosineSimilarity } from './embeddings.js';
import { agentAuth, hashApiKey, generateApiKey } from './agentAuth.js';
import { buildSuggestion } from './suggestion.js';

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  try {
    const result = await enrichResponse(prompt);
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
    const promptLower = prompt.toLowerCase();
    let bestCampaign = null;
    let highestScore = -1;
    const SIMILARITY_THRESHOLD = 0.25;

    const activeCampaigns = await Campaign.find({ active: 1 }).select('+embedding').lean();

    let promptEmbedding = null;

    for (const campaign of activeCampaigns) {
      let score = 0;

      if (campaign.keywords && campaign.keywords.length > 0) {
        let keywordMatches = 0;
        for (const kw of campaign.keywords) {
          if (promptLower.includes(kw.toLowerCase())) keywordMatches++;
        }
        if (keywordMatches > 0) {
          score = (keywordMatches / campaign.keywords.length) * 0.8;
        }
      }

      if (campaign.embedding && campaign.embedding.length > 0) {
        if (!promptEmbedding) {
          promptEmbedding = await embedText(prompt);
        }
        const vectorScore = cosineSimilarity(promptEmbedding, campaign.embedding);
        score = Math.max(score, vectorScore);
      }

      if (score > highestScore) {
        highestScore = score;
        bestCampaign = campaign;
      }
    }

    if (bestCampaign && highestScore > SIMILARITY_THRESHOLD) {
      const suggestion = buildSuggestion(bestCampaign);
      const tracking_url = `${req.protocol}://${req.get('host')}/t/${bestCampaign.tracking_code}?a=${agent.username}`;

      Event.create({
        campaign_id: bestCampaign._id,
        agent_id: agent.username,
        type: 'impression',
        user_prompt: prompt.substring(0, 500),
      }).catch(() => {});

      Agent.updateOne({ _id: agent._id }, { $inc: { total_impressions: 1 } }).catch(() => {});

      return res.json({
        match: true,
        intent: bestCampaign.category,
        suggestion,
        tracking_url,
        campaign: { name: bestCampaign.name, category: bestCampaign.category }
      });
    }

    return res.json({ match: false });

  } catch (error) {
    console.error('B2B Query Error:', error);
    return res.json({ match: false });
  }
});

// --- Agent Registration ---

app.post('/api/agents/register', async (req, res) => {
  const { username, owner_email } = req.body;

  if (!username || !owner_email) {
    return res.status(400).json({ error: 'Username and owner_email are required' });
  }

  try {
    const existing = await Agent.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already taken' });

    const api_key = generateApiKey();
    const api_key_hash = hashApiKey(api_key);

    await Agent.create({ username, owner_email, api_key_hash });

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

app.get('/api/agents', async (req, res) => {
  try {
    const agents = await Agent.find().sort({ total_clicks: -1 }).lean();
    res.json(agents.map(a => ({
      ...a,
      api_key_hash: undefined,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

app.get('/api/agents/:username/stats', async (req, res) => {
  const { username } = req.params;
  try {
    const agent = await Agent.findOne({ username }).lean();
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

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
    const campaign = await Campaign.findOne({ tracking_code: code }).select('_id brand_url cpc_rate').lean();
    if (campaign) {
      Event.create({
        campaign_id: campaign._id,
        agent_id: agentId || null,
        type: 'click'
      }).catch(() => {});

      if (agentId) {
        Agent.updateOne({ username: agentId }, { $inc: { total_clicks: 1 } }).catch(() => {});
      }

      return res.redirect(campaign.brand_url);
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

app.get('/api/dashboard/:campaignId', async (req, res) => {
  const { campaignId } = req.params;
  try {
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

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

app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await Campaign.find().select('-embedding').sort({ createdAt: -1 }).lean();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

app.post('/api/campaigns', async (req, res) => {
  const { name, category, brand_url, link_text, tagline, description, keywords, cpc_rate, cpa_percentage, tone, budget } = req.body;
  const tracking_code = nanoid(10);

  try {
    const promptContext = `${name} ${category} ${description || ''} ${(keywords || []).join(' ')} ${brand_url}`;
    const embedding = await embedText(promptContext);

    await Campaign.create({
      name, category, brand_url, link_text, tagline: tagline || '', tracking_code, embedding,
      description: description || '', keywords: keywords || [],
      cpc_rate: cpc_rate || 0, cpa_percentage: cpa_percentage || 0,
      tone: tone || 'informative', budget: budget || 0, source: 'partner',
    });

    loadCampaignCache();
    res.json({ id: tracking_code });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

app.put('/api/campaigns/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    loadCampaignCache();
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

app.delete('/api/campaigns/:id', async (req, res) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
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
  await loadCampaignCache();
  res.json({ success: true });
});

connectDB().then(() => {
  loadCampaignCache();
  app.listen(PORT, () => {
    console.log(`Synaptic AI(SI) Backend running on http://localhost:${PORT}`);
  });
}).catch(console.error);
