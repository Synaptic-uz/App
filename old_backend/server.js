import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
if (!globalThis.crypto) globalThis.crypto = crypto;

import express from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_DIST = path.join(__dirname, 'dashboard', 'dist');
import cors from 'cors';
import {
  connectDB,
  isDbConnected,
  Campaign,
  Event,
  Agent,
  Session,
  User,
  incrementCampaignImpression,
  incrementCampaignClick,
  creditAgentRevenue,
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
import {
  authenticateToken,
  hashPassword,
  comparePassword,
  issueAuthPair,
  verifyRefreshToken,
  requestMeta,
  hashRefreshToken,
} from './auth.js';
import {
  createAuthSession,
  rotateAuthSession,
  revokeAuthSession,
  revokeAllAuthSessions,
  listAuthSessions,
  validateRefreshForSession,
  newSessionId,
} from './authSessions.js';
import {
  getWalletSummary,
  depositWallet,
  allocateToCampaign,
  deallocateFromCampaign,
  allocateOnCampaignCreate,
  getWalletTransactions,
} from './wallet.js';
import { researchCampaign } from './campaignResearch.js';
import { buildMatchingPrompt } from './conversationUtils.js';
import { normalizeOfferings, mergeKeywordsFromOfferings } from './offerings.js';
import { getJobQueueStatus } from './jobQueue.js';
import { scheduleStartupJobs } from './startupJobs.js';

const AGENT_REVENUE_SHARE = parseFloat(process.env.AGENT_REVENUE_SHARE || '0.7');
const METRICS_PERIOD_DAYS = 7;

function periodStart(days = METRICS_PERIOD_DAYS) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function aggregateCampaignEvents(campaignId, since = null) {
  const match = { campaign_id: campaignId };
  if (since) match.createdAt = { $gte: since };

  const events = await Event.aggregate([
    { $match: match },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  let impressions = 0;
  let clicks = 0;
  let conversions = 0;
  for (const e of events) {
    if (e._id === 'impression') impressions += e.count;
    if (e._id === 'click') clicks += e.count;
    if (e._id === 'conversion') conversions += e.count;
  }

  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) + '%' : '0%';
  const conversion_rate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) + '%' : '0%';

  return { impressions, clicks, conversions, ctr, conversion_rate };
}

async function aggregateAgentEvents(username, since = null) {
  const match = { agent_id: username };
  if (since) match.createdAt = { $gte: since };

  const events = await Event.aggregate([
    { $match: match },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  let impressions = 0;
  let clicks = 0;
  for (const e of events) {
    if (e._id === 'impression') impressions += e.count;
    if (e._id === 'click') clicks += e.count;
  }

  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) + '%' : '0%';
  return { impressions, clicks, ctr };
}

function formatDailyStats(dailyStats) {
  const formattedDaily = {};
  for (const d of dailyStats) {
    if (!formattedDaily[d._id.date]) {
      formattedDaily[d._id.date] = { date: d._id.date, impressions: 0, clicks: 0, conversions: 0 };
    }
    if (d._id.type === 'impression') formattedDaily[d._id.date].impressions += d.count;
    if (d._id.type === 'click') formattedDaily[d._id.date].clicks += d.count;
    if (d._id.type === 'conversion') formattedDaily[d._id.date].conversions += d.count;
  }
  return Object.values(formattedDaily);
}

function buildSpendMetrics(clicks, cpcRate) {
  const cpc = Math.max(0, cpcRate || 0);
  const spent = clicks * cpc;
  return {
    cpc_rate: cpc,
    spent_period: spent,
    avg_cpc: clicks > 0 ? Math.round(spent / clicks) : cpc,
  };
}

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
  if (!email || !password || !role) return res.status(400).json({ error: 'Barcha maydonlar to‘ldirilishi shart' });

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Bu email allaqachon ro‘yxatdan o‘tgan' });

    const hashedPassword = await hashPassword(password);
    const walletSeed = role === 'business' ? parseInt(process.env.INITIAL_WALLET_BALANCE || '0', 10) : 0;
    const user = await User.create({
      email,
      password: hashedPassword,
      role,
      wallet_balance: Number.isFinite(walletSeed) && walletSeed > 0 ? walletSeed : 0,
    });

    await issueLoginResponse(user, req, res);
  } catch (error) {
    console.error('Auth register error:', error);
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(400).json({ error: 'Bu email allaqachon ro‘yxatdan o‘tgan' });
    }
    if (!isDbConnected()) {
      return res.status(503).json({ error: 'Ma’lumotlar bazasiga ulanib bo‘lmadi. Serverni qayta ishga tushiring.' });
    }
    res.status(500).json({ error: 'Ro‘yxatdan o‘tish muvaffaqiyatsiz' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Barcha maydonlar to‘ldirilishi shart' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Email yoki parol noto‘g‘ri' });

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Email yoki parol noto‘g‘ri' });

    await issueLoginResponse(user, req, res);
  } catch (error) {
    console.error('Auth login error:', error);
    res.status(500).json({ error: 'Kirish muvaffaqiyatsiz' });
  }
});

async function getAccountStats(userId, role) {
  if (role === 'business') {
    const user = await User.findById(userId).select('wallet_balance').lean();
    const [campaigns, active] = await Promise.all([
      Campaign.countDocuments({ owner_id: userId }),
      Campaign.countDocuments({ owner_id: userId, active: { $in: [1, true] } }),
    ]);
    let wallet;
    try {
      wallet = await getWalletSummary(userId);
    } catch {
      wallet = null;
    }
    return {
      campaigns,
      active_campaigns: active,
      wallet_balance: user?.wallet_balance || 0,
      allocated_remaining: wallet?.allocated_remaining ?? 0,
    };
  }
  if (role === 'agent') {
    const agentRows = await Agent.find({ owner_id: userId })
      .select('total_clicks total_requests')
      .lean();
    return {
      agents: agentRows.length,
      total_clicks: agentRows.reduce((s, a) => s + (a.total_clicks || 0), 0),
      total_requests: agentRows.reduce((s, a) => s + (a.total_requests || 0), 0),
    };
  }
  return {};
}

function serializeUser(user) {
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    display_name: user.display_name || '',
    company_name: user.company_name || '',
    phone: user.phone || '',
    wallet_balance: user.wallet_balance || 0,
    createdAt: user.createdAt,
  };
}

async function issueLoginResponse(user, req, res) {
  const meta = requestMeta(req);
  const sid = newSessionId();
  const pair = issueAuthPair(user, sid);
  await createAuthSession(user._id, pair.refreshToken, meta, sid);
  user.refresh_token_hash = null;
  await user.save();
  res.json(pair);
}

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refresh_token_hash').lean();
    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    const stats = await getAccountStats(user._id, user.role);
    res.json({ user: serializeUser(user), stats });
  } catch {
    res.status(500).json({ error: 'Foydalanuvchi yuklanmadi' });
  }
});

async function updateAuthProfile(req, res) {
  const { display_name, company_name, phone } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    if (display_name !== undefined) user.display_name = String(display_name).trim().slice(0, 80);
    if (company_name !== undefined) user.company_name = String(company_name).trim().slice(0, 120);
    if (phone !== undefined) user.phone = String(phone).trim().slice(0, 24);

    await user.save();
    const stats = await getAccountStats(user._id, user.role);
    res.json({ user: serializeUser(user.toObject()), stats });
  } catch {
    res.status(500).json({ error: 'Profil yangilanmadi' });
  }
}

app.patch('/api/auth/profile', authenticateToken, updateAuthProfile);
app.put('/api/auth/profile', authenticateToken, updateAuthProfile);

async function changeAuthPassword(req, res) {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Joriy va yangi parol kerak' });
  }
  if (String(new_password).length < 6) {
    return res.status(400).json({ error: 'Yangi parol kamida 6 belgidan iborat bo‘lishi kerak' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    const ok = await comparePassword(current_password, user.password);
    if (!ok) return res.status(400).json({ error: 'Joriy parol noto‘g‘ri' });

    user.password = await hashPassword(new_password);
    await revokeAllAuthSessions(user._id);
    await user.save();
    await issueLoginResponse(user, req, res);
  } catch {
    res.status(500).json({ error: 'Parol yangilanmadi' });
  }
}

app.patch('/api/auth/password', authenticateToken, changeAuthPassword);
app.put('/api/auth/password', authenticateToken, changeAuthPassword);

app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token talab qilinadi' });

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.id);
    if (!user) return res.status(403).json({ error: 'Foydalanuvchi topilmadi' });

  let sid = payload.sid || null;
  let valid = false;

  if (sid) {
    valid = await validateRefreshForSession(sid, user._id, refreshToken);
  } else {
    const hash = await hashRefreshToken(refreshToken);
    valid = Boolean(user.refresh_token_hash && user.refresh_token_hash === hash);
    if (valid) sid = newSessionId();
  }

  if (!valid) return res.status(403).json({ error: 'Refresh token yaroqsiz', code: 'REFRESH_EXPIRED' });

  const pair = issueAuthPair(user, sid);
  if (payload.sid) {
    await rotateAuthSession(sid, user._id, pair.refreshToken);
  } else {
    await createAuthSession(user._id, pair.refreshToken, {}, sid);
  }
  user.refresh_token_hash = null;
  await user.save();

  res.json(pair);
  } catch {
    res.status(403).json({ error: 'Refresh token muddati tugagan', code: 'REFRESH_EXPIRED' });
  }
});

app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    if (req.user.sid) {
      await revokeAuthSession(req.user.sid, req.user.id);
    } else {
      await User.updateOne({ _id: req.user.id }, { $set: { refresh_token_hash: null } });
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Chiqish muvaffaqiyatsiz' });
  }
});

app.get('/api/auth/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await listAuthSessions(req.user.id, req.user.sid);
    res.json({ sessions });
  } catch {
    res.status(500).json({ error: 'Sessiyalar yuklanmadi' });
  }
});

app.delete('/api/auth/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    if (req.params.sessionId === req.user.sid) {
      return res.status(400).json({ error: 'Joriy sessiyani bu yerda emas, chiqish tugmasidan foydalaning' });
    }
    await revokeAuthSession(req.params.sessionId, req.user.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Sessiya bekor qilinmadi' });
  }
});

app.post('/api/auth/sessions/revoke-all', authenticateToken, async (req, res) => {
  try {
    await revokeAllAuthSessions(req.user.id, req.user.sid);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Sessiyalar bekor qilinmadi' });
  }
});

// --- Wallet (biznes reklama balansi) ---

app.get('/api/wallet', authenticateToken, async (req, res) => {
  if (req.user.role !== 'business') {
    return res.status(403).json({ error: 'Faqat biznes hisobi uchun' });
  }
  try {
    const wallet = await getWalletSummary(req.user.id);
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Hamyon yuklanmadi' });
  }
});

app.get('/api/wallet/transactions', authenticateToken, async (req, res) => {
  if (req.user.role !== 'business') {
    return res.status(403).json({ error: 'Faqat biznes hisobi uchun' });
  }
  try {
    const transactions = await getWalletTransactions(req.user.id);
    res.json({ transactions });
  } catch {
    res.status(500).json({ error: 'Tranzaksiyalar yuklanmadi' });
  }
});

app.post('/api/wallet/deposit', authenticateToken, async (req, res) => {
  if (req.user.role !== 'business') {
    return res.status(403).json({ error: 'Faqat biznes hisobi uchun' });
  }
  if (process.env.ALLOW_MOCK_DEPOSIT !== '1') {
    return res.status(403).json({ error: 'To‘ldirish hozircha faqat test rejimida (ALLOW_MOCK_DEPOSIT=1)' });
  }
  try {
    const wallet = await depositWallet(req.user.id, req.body.amount, req.body.note);
    res.json(wallet);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'To‘ldirish bajarilmadi' });
  }
});

app.post('/api/wallet/allocate', authenticateToken, async (req, res) => {
  if (req.user.role !== 'business') {
    return res.status(403).json({ error: 'Faqat biznes hisobi uchun' });
  }
  try {
    const result = await allocateToCampaign(req.user.id, req.body.campaign_id, req.body.amount);
    loadCampaignCache();
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Ajratish bajarilmadi', code: err.code });
  }
});

app.post('/api/wallet/deallocate', authenticateToken, async (req, res) => {
  if (req.user.role !== 'business') {
    return res.status(403).json({ error: 'Faqat biznes hisobi uchun' });
  }
  try {
    const result = await deallocateFromCampaign(req.user.id, req.body.campaign_id, req.body.amount);
    loadCampaignCache();
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Qaytarish bajarilmadi' });
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
  const { prompt, answer_only, messages, session_id, parse_mode } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  try {
    const result = await enrichResponse(prompt, session_id || null, {
      answerOnly: !!answer_only,
      messages: messages || [],
      parseMode: parse_mode || 'Markdown',
    });
    res.json({ ...result, parse_mode: parse_mode || 'Markdown' });
  } catch (error) {
    console.error('Enrich error:', error);
    res.status(500).json({ error: 'Failed to enrich response' });
  }
});

// --- Production B2B Endpoint for AI Agents ---

app.post('/authorized/send_result', agentAuth, async (req, res) => {
  const { prompt, messages } = req.body;
  const agent = req.agent;

  const latestPrompt =
    prompt ||
    (Array.isArray(messages)
      ? [...messages].reverse().find((m) => (m.role === 'user' || m.sender === 'user') && (m.content || m.text))?.content ||
        [...messages].reverse().find((m) => (m.role === 'user' || m.sender === 'user') && (m.content || m.text))?.text
      : null);

  if (!latestPrompt) return res.json({ match: false });

  const matchPrompt = buildMatchingPrompt(latestPrompt, messages || []);

  try {
    const activeCampaigns = await Campaign.find({
      active: { $in: [1, true] },
    })
      .select('+embedding name tracking_code brand_url link_text keywords niche_keywords custom_category subcategory category tagline description offerings')
      .lean();

    const matchResult = await findBestCampaign(latestPrompt, activeCampaigns, {
      servingContext: { agentId: agent.username },
      matchPrompt,
    });
    const { campaign: bestCampaign, method: matchMethod } = matchResult;

    if (!bestCampaign || !isCampaignServeReady(bestCampaign)) {
      if (bestCampaign && !isCampaignServeReady(bestCampaign)) {
        console.warn(`[send_result] matched campaign incomplete: ${bestCampaign.tracking_code || bestCampaign._id}`);
      } else {
        console.log(
          `[send_result] no match | method=${matchMethod} | campaigns=${activeCampaigns.length} | prompt="${latestPrompt.substring(0, 80)}"`
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
        user_prompt: latestPrompt.substring(0, 500),
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
    return res.status(403).json({ error: 'Faqat agent hisoblari API kalit ro‘yxatdan o‘tkaza oladi' });
  }

  if (!username || !owner_email) {
    return res.status(400).json({ error: 'Foydalanuvchi nomi va email talab qilinadi' });
  }

  try {
    const existing = await Agent.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Bu foydalanuvchi nomi band' });

    const api_key = generateApiKey();
    const api_key_hash = hashApiKey(api_key);

    await Agent.create({ 
      username, 
      owner_email, 
      api_key_hash,
      owner_id: req.user.id 
    });

    res.json({
      message: 'Agent ro‘yxatdan o‘tdi. API kalitini saqlang — keyin ko‘rsatilmaydi.',
      api_key
    });
  } catch (error) {
    console.error('Agent Registration Error:', error);
    res.status(500).json({ error: 'Ro‘yxatdan o‘tish muvaffaqiyatsiz' });
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
    res.status(500).json({ error: 'Agentlar yuklanmadi' });
  }
});

app.patch('/api/agents/:id', authenticateToken, async (req, res) => {
  try {
    const agent = await Agent.findOne({ _id: req.params.id, owner_id: req.user.id });
    if (!agent) return res.status(404).json({ error: 'Agent topilmadi' });

    if (req.body.active !== undefined) {
      agent.active = !!req.body.active;
    }
    if (req.body.username !== undefined) {
      const taken = await Agent.findOne({ username: req.body.username, _id: { $ne: agent._id } });
      if (taken) return res.status(400).json({ error: 'Bu foydalanuvchi nomi band' });
      agent.username = req.body.username;
    }

    await agent.save();
    res.json({ ...agent.toObject(), api_key_hash: undefined });
  } catch (error) {
    res.status(500).json({ error: 'Agent yangilanmadi' });
  }
});

app.delete('/api/agents/:id', authenticateToken, async (req, res) => {
  try {
    const result = await Agent.deleteOne({ _id: req.params.id, owner_id: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Agent topilmadi' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Agent o‘chirilmadi' });
  }
});

app.get('/api/agents/:username/stats', authenticateToken, async (req, res) => {
  const { username } = req.params;
  try {
    const agent = await Agent.findOne({ username }).lean();
    if (!agent) return res.status(404).json({ error: 'Agent topilmadi' });

    // Enforce ownership
    if (agent.owner_id && agent.owner_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Ushbu agentga kirish huquqi yo‘q' });
    }

    const since7d = periodStart();
    const [totals7d, totalsAll, dailyStats] = await Promise.all([
      aggregateAgentEvents(username, since7d),
      aggregateAgentEvents(username),
      Event.aggregate([
        { $match: { agent_id: username, createdAt: { $gte: since7d } } },
        {
          $group: {
            _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, type: '$type' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.date': 1 } },
      ]),
    ]);

    res.json({
      agent: { ...agent, api_key_hash: undefined },
      period_days: METRICS_PERIOD_DAYS,
      totals: {
        impressions: totals7d.impressions,
        clicks: totals7d.clicks,
        revenue_earned: agent.revenue_earned || 0,
        ctr: totals7d.ctr,
      },
      totals_all_time: totalsAll,
      daily_stats: formatDailyStats(dailyStats),
    });
  } catch (error) {
    res.status(500).json({ error: 'Agent statistikasi yuklanmadi' });
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
      const cpc = campaign.cpc_rate || 0;

      try {
        await Event.create({
          campaign_id: campaign._id,
          agent_id: agentId || null,
          type: 'click',
        });
      } catch (eventErr) {
        console.error('[tracking] Event yozilmadi:', eventErr.message || eventErr);
      }

      recordClick(campaign._id);
      try {
        await incrementCampaignClick(campaign._id, cpc);
      } catch (clickErr) {
        console.error('[tracking] Kampaniya click hisobi yangilanmadi:', clickErr.message || clickErr);
      }

      if (agentId) {
        const share = Math.round(cpc * AGENT_REVENUE_SHARE);
        creditAgentRevenue(agentId, share).catch(() => {});
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
    if (!campaign) return res.status(404).json({ error: 'Kampaniya topilmadi' });

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
    if (!campaign) return res.status(404).json({ error: 'Kampaniya topilmadi' });

    // Enforce ownership
    if (campaign.owner_id && campaign.owner_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Ushbu kampaniyaga kirish huquqi yo‘q' });
    }

    const since7d = periodStart();
    const [totals7d, totalsAll, dailyStats] = await Promise.all([
      aggregateCampaignEvents(campaign._id, since7d),
      aggregateCampaignEvents(campaign._id),
      Event.aggregate([
        { $match: { campaign_id: campaign._id, createdAt: { $gte: since7d } } },
        {
          $group: {
            _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, type: '$type' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.date': 1 } },
      ]),
    ]);

    const clicks7d = Math.max(totals7d.clicks, 0);
    const clicksAll = Math.max(totalsAll.clicks, campaign.stats_clicks || 0);
    const impressionsAll = Math.max(totalsAll.impressions, campaign.stats_impressions || 0);
    const spend7d = buildSpendMetrics(clicks7d, campaign.cpc_rate);
    const budgetRemaining = Math.max(0, (campaign.budget || 0) - (campaign.spent || 0));
    const trackingPath = `/t/${campaign.tracking_code}`;

    res.json({
      period_days: METRICS_PERIOD_DAYS,
      campaign: {
        id: campaign._id,
        name: campaign.name,
        category: campaign.category,
        brand_url: campaign.brand_url,
        tracking_code: campaign.tracking_code,
        tracking_path: trackingPath,
        cpc_rate: campaign.cpc_rate,
        cpa_percentage: campaign.cpa_percentage,
        budget: campaign.budget,
        spent: campaign.spent,
        budget_remaining: budgetRemaining,
        source: campaign.source,
      },
      totals: {
        ...totals7d,
        clicks: clicks7d,
        ...spend7d,
      },
      totals_all_time: {
        ...totalsAll,
        clicks: clicksAll,
        impressions: impressionsAll,
        ctr:
          impressionsAll > 0
            ? ((clicksAll / impressionsAll) * 100).toFixed(2) + '%'
            : totalsAll.ctr,
      },
      daily_stats: formatDailyStats(dailyStats),
    });
  } catch (error) {
    res.status(500).json({ error: 'Analitika yuklanmadi' });
  }
});

// --- Campaign CRUD ---

app.get('/api/categories', (_req, res) => {
  res.json(getCategoryOptions());
});

app.post('/api/campaigns/profile-preview', authenticateToken, async (req, res) => {
  if (req.user.role !== 'business') {
    return res.status(403).json({ error: 'Faqat biznes hisoblari profil ko‘rinishidan foydalanishi mumkin' });
  }

  const body = { ...req.body };
  if (body.offerings) body.offerings = normalizeOfferings(body.offerings);
  if (body.keywords && typeof body.keywords === 'string') {
    body.keywords = body.keywords.split(',').map((k) => k.trim()).filter(Boolean);
  }
  if (body.niche_keywords && typeof body.niche_keywords === 'string') {
    body.niche_keywords = body.niche_keywords.split(',').map((k) => k.trim()).filter(Boolean);
  }

  const profile_text = buildCampaignProfileText(body);
  res.json({
    profile_text,
    length: profile_text.length,
    has_embedding_service: Boolean(process.env.GITHUB_TOKEN),
  });
});

app.get('/api/campaigns/:id/profile', authenticateToken, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, owner_id: req.user.id })
      .select('-embedding')
      .lean();
    if (!campaign) return res.status(404).json({ error: 'Kampaniya topilmadi' });

    const profile_text = buildCampaignProfileText(campaign);
    res.json({
      profile_text,
      length: profile_text.length,
      embedding_dimensions: Array.isArray(campaign.embedding) ? campaign.embedding.length : 0,
      updatedAt: campaign.updatedAt,
    });
  } catch {
    res.status(500).json({ error: 'Profil yuklanmadi' });
  }
});

app.post('/api/campaigns/research', authenticateToken, async (req, res) => {
  if (req.user.role !== 'business') {
    return res.status(403).json({ error: 'Faqat biznes hisoblari AI tadqiqotdan foydalanishi mumkin' });
  }

  const { brand_url, name, category, brief } = req.body;
  if (!brand_url || !/^https?:\/\//i.test(brand_url)) {
    return res.status(400).json({ error: 'To‘g‘ri brand URL kiriting (https://...)' });
  }

  try {
    const result = await researchCampaign({ brand_url, name, category, brief });
    if (result.error) return res.status(503).json({ error: result.error });
    res.json(result);
  } catch (error) {
    console.error('Campaign research error:', error);
    res.status(500).json({ error: 'AI tadqiqot bajarilmadi' });
  }
});

app.get('/api/campaigns', authenticateToken, async (req, res) => {
  try {
    const query = req.user.role === 'business' ? { owner_id: req.user.id } : {};
    const campaigns = await Campaign.find(query).select('-embedding').sort({ createdAt: -1 }).lean();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Kampaniyalar yuklanmadi' });
  }
});

app.get('/api/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, owner_id: req.user.id })
      .select('-embedding')
      .lean();
    if (!campaign) return res.status(404).json({ error: 'Kampaniya topilmadi' });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Kampaniya yuklanmadi' });
  }
});

app.patch('/api/campaigns/:id/status', authenticateToken, async (req, res) => {
  if (req.user.role !== 'business') {
    return res.status(403).json({ error: 'Faqat biznes hisoblari kampaniya holatini o‘zgartira oladi' });
  }
  const active = req.body.active;
  if (active !== 0 && active !== 1 && active !== true && active !== false) {
    return res.status(400).json({ error: 'active: 0 (pauza) yoki 1 (faol) bo‘lishi kerak' });
  }
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, owner_id: req.user.id });
    if (!campaign) return res.status(404).json({ error: 'Kampaniya topilmadi' });
    campaign.active = active === true || active === 1 ? 1 : 0;
    await campaign.save();
    loadCampaignCache();
    res.json({ _id: campaign._id, active: campaign.active });
  } catch (error) {
    res.status(500).json({ error: 'Holat yangilanmadi' });
  }
});

app.post('/api/campaigns', authenticateToken, async (req, res) => {
  if (req.user.role !== 'business') {
    return res.status(403).json({ error: 'Faqat biznes hisoblari kampaniya yaratishi mumkin' });
  }

  const {
    name, category, subcategory, custom_category, brand_url, link_text, tagline, description,
    keywords, niche_keywords, offerings, cpc_rate, cpa_percentage, tone, budget,
  } = req.body;
  const tracking_code = nanoid(10);

  if (!name || !category || !brand_url) {
    return res.status(400).json({ error: 'Nom, kategoriya va brend havolasi talab qilinadi' });
  }

  if (category === 'other' && !custom_category?.trim()) {
    return res.status(400).json({ error: '«Boshqa» tanlaganda kategoriya nomini yozing' });
  }

  const offeringList = normalizeOfferings(offerings);
  const kwList = mergeKeywordsFromOfferings(
    Array.isArray(keywords) ? keywords.filter(Boolean) : [],
    offeringList
  );
  if (kwList.length === 0) {
    return res.status(400).json({ error: 'Kamida bitta kalit so‘z yoki mahsulot/xizmat nomi kerak' });
  }

  const sub = subcategory || defaultSubcategory(category);

  try {
    const campaignData = {
      name, category, subcategory: sub, custom_category: custom_category?.trim() || '',
      tagline, description,
      keywords: kwList,
      niche_keywords: Array.isArray(niche_keywords) ? niche_keywords.filter(Boolean) : [],
      offerings: offeringList,
    };

    let embedding = [];
    if (process.env.GITHUB_TOKEN) {
      try {
        embedding = await embedText(buildCampaignProfileText(campaignData));
      } catch (e) {
        console.warn('Embedding failed during creation:', e.message);
      }
    }

    const budgetAmt = Math.round(Number(budget) || 0);

    const campaign = await Campaign.create({
      ...campaignData,
      brand_url,
      link_text: link_text || name, tracking_code, embedding,
      cpc_rate: cpc_rate || 0, cpa_percentage: cpa_percentage || 0,
      tone: tone || 'informative', budget: 0, source: 'partner',
      owner_id: req.user.id,
      active: budgetAmt > 0 ? 1 : 0,
    });

    if (budgetAmt > 0) {
      await allocateOnCampaignCreate(req.user.id, campaign, budgetAmt);
      await campaign.save();
    }

    loadCampaignCache();
    res.json({ id: tracking_code, _id: campaign._id });
  } catch (error) {
    console.error('Create campaign error:', error);
    const status = error.status || 500;
    res.status(status).json({
      error: error.message || 'Kampaniya yaratib bo‘lmadi',
      code: error.code,
    });
  }
});

app.put('/api/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, owner_id: req.user.id });
    if (!campaign) return res.status(404).json({ error: 'Kampaniya topilmadi yoki ruxsat yo‘q' });
    
    const fields = ['name', 'category', 'subcategory', 'custom_category', 'tagline', 'description', 'keywords', 'niche_keywords', 'brand_url', 'link_text', 'cpc_rate', 'cpa_percentage', 'budget', 'active', 'tone', 'offerings'];
    for (const f of fields) {
      if (req.body[f] === undefined) continue;
      if (f === 'offerings') {
        campaign.offerings = normalizeOfferings(req.body.offerings);
        continue;
      }
      campaign[f] = req.body[f];
    }

    if (req.body.offerings !== undefined) {
      campaign.keywords = mergeKeywordsFromOfferings(campaign.keywords, campaign.offerings);
    }
    
    if (process.env.GITHUB_TOKEN) {
      try {
        campaign.embedding = await embedText(buildCampaignProfileText(campaign));
      } catch (e) {
        console.warn('Auto-embedding failed during update:', e.message);
      }
    }
    
    await campaign.save();
    loadCampaignCache();
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Kampaniya yangilanmadi' });
  }
});

app.post('/api/campaigns/:id/refresh-embedding', authenticateToken, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, owner_id: req.user.id });
    if (!campaign) return res.status(404).json({ error: 'Kampaniya topilmadi' });

    if (!process.env.GITHUB_TOKEN) {
      return res.status(500).json({ error: 'Embedding xizmati ulanmagan (GITHUB_TOKEN yo‘q)' });
    }

    const text = buildCampaignProfileText(campaign);
    campaign.embedding = await embedText(text);
    await campaign.save();
    
    loadCampaignCache();
    res.json({ success: true, text_used: text });
  } catch (error) {
    console.error('Refresh embedding error:', error);
    res.status(500).json({ error: 'Embeddingni yangilab bo‘lmadi' });
  }
});

app.delete('/api/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    const result = await Campaign.deleteOne({ _id: req.params.id, owner_id: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Kampaniya topilmadi yoki ruxsat yo‘q' });
    
    loadCampaignCache();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Kampaniya o‘chirilmadi' });
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
app.get('/api/health', async (_req, res) => {
  res.json({
    ok: true,
    db: isDbConnected(),
    queue: getJobQueueStatus(),
  });
});

app.post('/api/cache/clear', async (req, res) => {
  analyticsCache = { data: null, timestamp: 0 };
  clearServingState();
  await loadCampaignCache();
  await bootstrapRankingStats(bulkLoadCtr);
  res.json({ success: true });
});

// Built dashboard (npm run build in dashboard/) — same origin, no proxy 404 on PATCH
if (fs.existsSync(path.join(DASHBOARD_DIST, 'index.html'))) {
  app.use(express.static(DASHBOARD_DIST));
  app.get(/^(?!\/api|\/authorized|\/t\/).*/, (_req, res) => {
    res.sendFile(path.join(DASHBOARD_DIST, 'index.html'));
  });
  console.log('[static] Dashboard:', DASHBOARD_DIST);
}

connectDB().then(async () => {
  // Fast path: serve API with whatever is already in MongoDB
  try {
    await loadCampaignCache();
    await bootstrapRankingStats(bulkLoadCtr);
  } catch (e) {
    console.warn('[startup] Initial cache load:', e.message || e);
  }

  app.listen(PORT, () => {
    console.log(`Synaptic AI(SI) Backend running on http://localhost:${PORT}`);
    scheduleStartupJobs();
  });
}).catch((err) => {
  console.error('Cannot start — MongoDB ulanmadi:', err.message || err);
  console.error('Tekshiring: MONGODB_URI (.env), MongoDB/Atlas ishlayaptimi, internet va IP whitelist.');
  process.exit(1);
});
