import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB, Campaign, Event, Session } from './db.js';
import { enrichResponse, loadCampaignCache } from './enrichment.js';
import { nanoid } from 'nanoid';
import { embedText } from './embeddings.js';

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
const ANALYTICS_CACHE_TTL = 10000; // 10 seconds

async function getCachedAnalytics() {
  if (analyticsCache.data && Date.now() - analyticsCache.timestamp < ANALYTICS_CACHE_TTL) {
    return analyticsCache.data;
  }

  const campaigns = await Campaign.find().lean();
  const campaignIds = campaigns.map(c => c._id);

  const [stats, intentStats] = await Promise.all([
    Event.aggregate([
      { $match: { campaign_id: { $in: campaignIds } } },
      { $group: { _id: { campaign_id: "$campaign_id", type: "$type" }, count: { $sum: 1 } } }
    ]),
    Event.aggregate([
      { $group: { _id: "$intent_type", count: { $sum: 1 }, conversions: { $sum: { $cond: [{ $eq: ["$type", "conversion"] }, 1, 0] } } } }
    ])
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
    intent_breakdown: intentStats,
  };

  analyticsCache = { data: result, timestamp: Date.now() };
  return result;
}

// --- Core Endpoints ---

app.post('/api/enrich', async (req, res) => {
  const { prompt, session_id } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  try {
    const result = await enrichResponse(prompt, session_id);
    res.json(result);
  } catch (error) {
    console.error('Enrich error:', error);
    res.status(500).json({ error: 'Failed to enrich response' });
  }
});

app.get('/t/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const campaign = await Campaign.findOne({ tracking_code: code }).select('_id brand_url cpc_rate spent').lean();
    if (campaign) {
      Event.create({ campaign_id: campaign._id, type: 'click' }).catch(() => {});
      Campaign.findByIdAndUpdate(campaign._id, { $inc: { spent: campaign.cpc_rate } }).catch(() => {});
      return res.redirect(campaign.brand_url);
    }
    res.status(404).send('Invalid tracking link');
  } catch (error) {
    res.status(500).send('Server Error');
  }
});

app.post('/api/conversion', async (req, res) => {
  const { session_id, campaign_id, conversion_value, metadata } = req.body;
  if (!session_id || !campaign_id) return res.status(400).json({ error: 'session_id and campaign_id required' });

  try {
    const campaign = await Campaign.findById(campaign_id).select('cpa_percentage cpa_rate spent').lean();
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const cpaAmount = conversion_value ? (conversion_value * campaign.cpa_percentage) / 100 : campaign.cpa_rate;

    await Event.create({ campaign_id, type: 'conversion', session_id, conversion_value: conversion_value || 0, metadata: { ...metadata, cpa_earned: cpaAmount } });
    Campaign.findByIdAndUpdate(campaign_id, { $inc: { spent: cpaAmount } }).catch(() => {});

    res.json({ success: true, cpa_earned: cpaAmount, cpa_percentage: campaign.cpa_percentage });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

// --- Analytics (Cached) ---

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

// --- B2B Dashboard ---

app.get('/api/dashboard/:campaignId', async (req, res) => {
  const { campaignId } = req.params;
  try {
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const [events, dailyStats] = await Promise.all([
      Event.aggregate([
        { $match: { campaign_id: campaign._id } },
        { $group: { _id: { type: "$type", intent: "$intent_type" }, count: { $sum: 1 }, total_conversion_value: { $sum: "$conversion_value" } } }
      ]),
      Event.aggregate([
        { $match: { campaign_id: campaign._id, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, type: "$type" }, count: { $sum: 1 } } },
        { $sort: { "_id.date": 1 } }
      ])
    ]);

    const intentBreakdown = {};
    let totalImpressions = 0, totalClicks = 0, totalConversions = 0;

    for (const e of events) {
      const intent = e._id.intent || 'unknown';
      if (!intentBreakdown[intent]) intentBreakdown[intent] = { impressions: 0, clicks: 0, conversions: 0 };
      if (e._id.type === 'impression') { intentBreakdown[intent].impressions += e.count; totalImpressions += e.count; }
      if (e._id.type === 'click') { intentBreakdown[intent].clicks += e.count; totalClicks += e.count; }
      if (e._id.type === 'conversion') { intentBreakdown[intent].conversions += e.count; totalConversions += e.count; }
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
      intent_breakdown: intentBreakdown,
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
  const { name, category, brand_url, link_text, description, keywords, cpc_rate, cpa_percentage, tone, budget } = req.body;
  const tracking_code = nanoid(10);

  try {
    const promptContext = `${name} ${category} ${description || ''} ${(keywords || []).join(' ')} ${brand_url}`;
    const embedding = await embedText(promptContext);

    await Campaign.create({
      name, category, brand_url, link_text, tracking_code, embedding,
      description: description || '', keywords: keywords || [],
      cpc_rate: cpc_rate || 0, cpa_percentage: cpa_percentage || 0,
      tone: tone || 'informative', budget: budget || 0, source: 'partner',
    });

    loadCampaignCache(); // Refresh cache
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

// --- Cache Invalidation Endpoint ---
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
