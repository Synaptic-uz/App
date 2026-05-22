import crypto from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = crypto;

import mongoose from 'mongoose';
import { embedText } from './embeddings.js';
import { buildCampaignProfileText, defaultSubcategory } from './categories.js';

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/synaptic-ai';

let isConnected = false;

export function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export async function connectDB() {
  if (isConnected) return true;
  try {
    await mongoose.connect(URI, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    });
    isConnected = true;
    console.log("Connected to MongoDB via Mongoose (pool: 20)");
    await seedDatabase();
    return true;
  } catch (error) {
    isConnected = false;
    console.error("MongoDB connection error:", error.message || error);
    throw error;
  }
}

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  subcategory: { type: String, default: 'general' },
  custom_category: { type: String, default: '' },
  niche_keywords: { type: [String], default: [] },
  brand_url: { type: String, required: true },
  link_text: { type: String, required: true },
  tagline: { type: String, default: "" },
  tracking_code: { type: String, required: true, unique: true },
  active: { type: Number, default: 1 },
  embedding: { type: [Number], required: false },
  description: { type: String, default: '' },
  keywords: { type: [String], default: [] },
  cpc_rate: { type: Number, default: 0 },
  cpa_rate: { type: Number, default: 0 },
  cpa_percentage: { type: Number, default: 0 },
  tone: { type: String, enum: ['informative', 'promotional', 'comparative', 'deal-focused'], default: 'informative' },
  source: { type: String, enum: ['partner', 'scraped', 'seed'], default: 'seed' },
  budget: { type: Number, default: 0 },
  spent: { type: Number, default: 0 },
  max_daily_impressions: { type: Number, default: 1000 },
  today_impressions: { type: Number, default: 0 },
  last_reset_date: { type: Date, default: Date.now },
  stats_impressions: { type: Number, default: 0 },
  stats_clicks: { type: Number, default: 0 },
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: true });

campaignSchema.index({ active: 1 });
campaignSchema.index({ category: 1 });
campaignSchema.index({ source: 1 });

export const Campaign = mongoose.model('Campaign', campaignSchema);

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['business', 'agent'], required: true },
  /** Business account balance (UZS) — deducted when campaign budget is allocated */
  balance: { type: Number, default: 0 },
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);

const eventSchema = new mongoose.Schema({
  campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
  agent_id: { type: String, default: null, index: true },
  session_id: { type: String, default: null, index: true },
  intent_type: { type: String, default: null },
  type: { type: String, enum: ['impression', 'click', 'conversion'], required: true },
  user_prompt: { type: String, default: null },
  conversion_value: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

eventSchema.index({ campaign_id: 1, type: 1 });
eventSchema.index({ agent_id: 1, type: 1 });
eventSchema.index({ createdAt: -1 });

export const Event = mongoose.model('Event', eventSchema);

const agentSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  owner_email: { type: String, required: true },
  api_key_hash: { type: String, required: true, unique: true },
  active: { type: Boolean, default: true },
  total_requests: { type: Number, default: 0 },
  total_impressions: { type: Number, default: 0 },
  total_clicks: { type: Number, default: 0 },
  revenue_earned: { type: Number, default: 0 },
  last_seen: { type: Date },
}, { timestamps: true });

agentSchema.index({ active: 1 });

export const Agent = mongoose.model('Agent', agentSchema);

const sessionSchema = new mongoose.Schema({
  session_id: { type: String, required: true, unique: true },
  user_prompt: { type: String, required: true },
  intent_type: { type: String, enum: ['cold', 'warm', 'hot'], default: 'cold' },
  intent_confidence: { type: Number, default: 0 },
  matched_campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  similarity_score: { type: Number, default: 0 },
  enriched: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

sessionSchema.index({ intent_type: 1, createdAt: -1 });
sessionSchema.index({ matched_campaign_id: 1 });

export const Session = mongoose.model('Session', sessionSchema);

/** Load impression/click totals into in-memory ranking CTR cache (pass bulkLoadCtr from adRanking). */
export async function bootstrapRankingStats(bulkLoadCtr) {
  const rows = await Campaign.find({})
    .select('_id stats_impressions stats_clicks')
    .lean();
  bulkLoadCtr(
    rows.map((r) => ({
      _id: r._id,
      impressions: r.stats_impressions || 0,
      clicks: r.stats_clicks || 0,
    }))
  );
}

/** Sum of remaining budgets across a business owner's campaigns. */
export function sumCampaignBudgets(campaigns) {
  return (campaigns || []).reduce((sum, c) => sum + Math.max(0, Number(c.budget) || 0), 0);
}

/** True when campaign can still afford at least one click (budget 0 = unlimited). */
export function campaignHasBudgetRemaining(campaign) {
  const budget = Number(campaign?.budget) || 0;
  if (budget <= 0) return true;
  const cpc = Number(campaign?.cpc_rate) || 0;
  if (cpc > 0) return budget >= cpc;
  return budget > 0;
}

/** One-time: budget field becomes remaining funds (was cap minus spent). */
export async function migrateBudgetToRemaining() {
  const campaigns = await Campaign.find({ budget: { $gt: 0 }, spent: { $gt: 0 } }).lean();
  for (const c of campaigns) {
    const remaining = Math.max(0, c.budget - c.spent);
    if (remaining !== c.budget) {
      await Campaign.updateOne({ _id: c._id }, { $set: { budget: remaining } });
    }
  }
}

/** Record impression counts only — CPC is charged on click, not impression. */
export async function incrementCampaignImpression(campaignId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const campaign = await Campaign.findById(campaignId).select('last_reset_date today_impressions').lean();
  if (!campaign) return;

  const last = campaign.last_reset_date ? new Date(campaign.last_reset_date) : null;
  const sameDay = last && last.toDateString() === today.toDateString();

  if (sameDay) {
    await Campaign.updateOne(
      { _id: campaignId },
      { $inc: { today_impressions: 1, stats_impressions: 1 } }
    );
  } else {
    await Campaign.updateOne(
      { _id: campaignId },
      {
        $set: { today_impressions: 1, last_reset_date: today },
        $inc: { stats_impressions: 1 },
      }
    );
  }
}

/**
 * CPC on click: subtract from campaign.budget (remaining balance) and track lifetime spent.
 */
export async function chargeCampaignClick(campaignId, cpcRate = 0, agentUsername = null) {
  const rate = Number(cpcRate) || 0;

  if (rate <= 0) {
    await Campaign.updateOne({ _id: campaignId }, { $inc: { stats_clicks: 1 } });
    if (agentUsername) {
      await Agent.updateOne({ username: agentUsername }, { $inc: { total_clicks: 1 } });
    }
    return { charged: 0 };
  }

  const camp = await Campaign.findById(campaignId).select('budget').lean();
  const unlimited = !camp || Number(camp.budget) <= 0;

  let updated;
  if (unlimited) {
    updated = await Campaign.findOneAndUpdate(
      { _id: campaignId },
      { $inc: { stats_clicks: 1, spent: rate } },
      { new: true }
    ).lean();
  } else {
    updated = await Campaign.findOneAndUpdate(
      { _id: campaignId, budget: { $gte: rate } },
      { $inc: { budget: -rate, spent: rate, stats_clicks: 1 } },
      { new: true }
    ).lean();
  }

  if (!updated) {
    await Campaign.updateOne({ _id: campaignId }, { $inc: { stats_clicks: 1 } });
    if (agentUsername) {
      await Agent.updateOne({ username: agentUsername }, { $inc: { total_clicks: 1 } });
    }
    return { charged: 0, reason: 'budget_exhausted' };
  }

  if (agentUsername) {
    await Agent.updateOne(
      { username: agentUsername },
      { $inc: { total_clicks: 1, revenue_earned: rate } }
    );
  }

  return { charged: rate, spent: updated.spent, budget: updated.budget };
}

async function embedForCampaign(doc) {
  return embedText(buildCampaignProfileText(doc));
}

/** Keep only UZ-market demo campaigns; deactivate legacy US/global seeds. */
async function migrateCampaignCatalog() {
  await Campaign.updateMany(
    { tracking_code: { $in: ['bb-coffee-123', 'do-cloud-456', 'ab-travel-789', 'upg-gaming-006'] } },
    { $set: { active: 0 } }
  );

  const patches = [
    {
      tracking_code: 'uzum-electronics-001',
      set: {
        category: 'electronics',
        subcategory: 'general',
        niche_keywords: [],
        tagline: "O'zbekistonning eng yirik marketplace — telefon, noutbuk, muddatli to'lov",
        keywords: ['noutbuk', 'telefon', 'iphone', 'samsung', 'elektronika', 'laptop', 'texnika', 'gadjet', 'smartphone'],
        active: 1,
      },
    },
    {
      tracking_code: 'olcha-electronics-002',
      set: {
        category: 'electronics',
        subcategory: 'general',
        niche_keywords: [],
        tagline: "Texnika va elektronika — telefon, noutbuk, muddatli to'lov",
        keywords: ['noutbuk', 'kompyuter', 'telefon', 'muddatli tolov', 'texnika', 'iphone', 'laptop', 'smartphone'],
        active: 1,
      },
    },
    {
      tracking_code: 'zood-finance-003',
      set: { category: 'finance', subcategory: 'installment', active: 1 },
    },
    {
      tracking_code: 'yandex-food-004',
      set: { category: 'food', subcategory: 'delivery', active: 1 },
    },
    {
      tracking_code: 'moda-fashion-005',
      set: { category: 'fashion', subcategory: 'general', active: 1 },
    },
  ];

  for (const { tracking_code, set } of patches) {
    const exists = await Campaign.findOne({ tracking_code });
    if (exists) {
      await Campaign.updateOne({ tracking_code }, { $set: set });
      if (process.env.GITHUB_TOKEN) {
        const merged = { ...exists.toObject(), ...set };
        const embedding = await embedForCampaign(merged);
        await Campaign.updateOne({ tracking_code }, { $set: { embedding } });
      }
    }
  }

}

async function seedDatabase() {
  await migrateCampaignCatalog();
  await migrateBudgetToRemaining();

  const count = await Campaign.countDocuments({ active: { $in: [1, true] } });

  if (count < 4 && process.env.GITHUB_TOKEN) {
    console.log("Seeding core Uzbekistan campaigns...");

    const embedTech = await embedText(buildCampaignProfileText({
      name: 'Uzum Market', category: 'electronics', subcategory: 'general',
      tagline: "Marketplace telefon noutbuk", keywords: ['noutbuk', 'telefon'], niche_keywords: [],
    }));
    const embedFashion = await embedText("fashion kiyim moda oyoq kiyim");
    const embedFinance = await embedText("muddatli tolov kredit installment");
    const embedFood = await embedText("food delivery yetkazib pizza ovqat");

    await Campaign.insertMany([
      {
        name: 'Uzum Market',
        category: 'electronics',
        subcategory: 'general',
        niche_keywords: [],
        brand_url: 'https://uzum.market',
        link_text: 'Uzum Market',
        tagline: "O'zbekistonning eng yirik marketplace — telefon, noutbuk, muddatli to'lov",
        tracking_code: 'uzum-electronics-001',
        embedding: embedTech,
        description: "Onlayn marketplace: telefon, noutbuk, elektronika.",
        keywords: ['noutbuk', 'telefon', 'iphone', 'samsung', 'elektronika', 'laptop', 'texnika', 'gadjet'],
        cpc_rate: 500,
        cpa_percentage: 3,
        tone: 'deal-focused',
        source: 'partner',
        budget: 1000000,
        max_daily_impressions: 5000,
      },
      {
        name: 'Olcha Market',
        category: 'electronics',
        subcategory: 'general',
        niche_keywords: [],
        brand_url: 'https://olcha.uz',
        link_text: 'Olcha Market',
        tagline: "Texnika va elektronika — telefon, noutbuk, muddatli to'lov",
        tracking_code: 'olcha-electronics-002',
        embedding: embedTech,
        description: "Texnika va elektronika do'koni.",
        keywords: ['noutbuk', 'kompyuter', 'telefon', 'muddatli tolov', 'texnika', 'iphone', 'laptop'],
        cpc_rate: 400,
        cpa_percentage: 2.5,
        tone: 'comparative',
        source: 'partner',
        budget: 800000,
        max_daily_impressions: 3000,
      },
      {
        name: 'ZoodMall',
        category: 'finance',
        subcategory: 'installment',
        niche_keywords: [],
        brand_url: 'https://zoodmall.com',
        link_text: 'ZoodMall',
        tagline: "0% ustama bilan 6-12 oyga bo'lib to'lash — hoziroq xarid qiling",
        tracking_code: 'zood-finance-003',
        embedding: embedFinance,
        description: "Muddatli to'lov bilan xarid qilish platformasi. 0% ustama bilan 6-12 oyga bo'lib to'lash.",
        keywords: ['muddatli tolov', 'kredit', 'bo\'lib to\'lash', 'installment', '0%'],
        cpc_rate: 600,
        cpa_rate: 0,
        cpa_percentage: 5,
        tone: 'deal-focused',
        source: 'partner',
        budget: 1200000,
        spent: 0,
        max_daily_impressions: 4000,
      },
      {
        name: 'Yandex Eats',
        category: 'food',
        subcategory: 'delivery',
        niche_keywords: [],
        brand_url: 'https://eda.yandex.uz',
        link_text: 'Yandex Eats',
        tagline: "Tezkor yetkazib berish — eng yaxshi restaurantlardan buyurtma qiling",
        tracking_code: 'yandex-food-004',
        embedding: embedFood,
        description: "Tezkor yetkazib berish xizmati. Restaurantlar va fast food.",
        keywords: ['yetkazib berish', 'delivery', 'ovqat', 'pizza', 'sushi', 'taom'],
        cpc_rate: 350,
        cpa_rate: 0,
        cpa_percentage: 8,
        tone: 'deal-focused',
        source: 'partner',
        budget: 700000,
        spent: 0,
        max_daily_impressions: 3000,
      },
      {
        name: 'Moda.uz',
        category: 'fashion',
        subcategory: 'general',
        niche_keywords: [],
        brand_url: 'https://moda.uz',
        link_text: 'Moda.uz',
        tagline: "O'zbekistondagi eng katta moda do'koni — trend kiyimlar va oyoq kiyimlar",
        tracking_code: 'moda-fashion-005',
        embedding: embedFashion,
        description: "O'zbekistondagi eng katta moda va kiyim-kechak onlayn do'koni.",
        keywords: ['kiyim', 'moda', 'fashion', 'oyoq kiyim', 'dress', 'style'],
        cpc_rate: 250,
        cpa_rate: 0,
        cpa_percentage: 4,
        tone: 'promotional',
        source: 'partner',
        budget: 500000,
        spent: 0,
        max_daily_impressions: 2500,
      },
    ]);
    console.log("Core campaigns seeded.");
  } else if (count < 4) {
    console.warn('GITHUB_TOKEN not set — seeding campaigns without embeddings (keyword matching only)');
    await Campaign.insertMany([
      {
        name: 'Uzum Market',
        category: 'electronics',
        subcategory: 'general',
        brand_url: 'https://uzum.market',
        link_text: 'Uzum Market',
        tagline: "Telefon, noutbuk, muddatli to'lov",
        tracking_code: 'uzum-electronics-001',
        keywords: ['noutbuk', 'telefon', 'iphone', 'laptop', 'elektronika', 'texnika'],
        active: 1,
        source: 'seed',
      },
      {
        name: 'Olcha Market',
        category: 'electronics',
        subcategory: 'general',
        brand_url: 'https://olcha.uz',
        link_text: 'Olcha Market',
        tagline: "Texnika va elektronika",
        tracking_code: 'olcha-electronics-002',
        keywords: ['noutbuk', 'kompyuter', 'telefon', 'iphone', 'laptop'],
        active: 1,
        source: 'seed',
      },
      {
        name: 'Yandex Eats',
        category: 'food',
        subcategory: 'delivery',
        brand_url: 'https://eda.yandex.uz',
        link_text: 'Yandex Eats',
        tagline: 'Tezkor yetkazib berish',
        tracking_code: 'yandex-food-004',
        keywords: ['yetkazib', 'delivery', 'ovqat', 'pizza', 'taom'],
        active: 1,
        source: 'seed',
      },
      {
        name: 'Moda.uz',
        category: 'fashion',
        subcategory: 'general',
        brand_url: 'https://moda.uz',
        link_text: 'Moda.uz',
        tagline: "Moda va kiyim-kechak",
        tracking_code: 'moda-fashion-005',
        keywords: ['kiyim', 'moda', 'fashion', 'oyoq kiyim'],
        active: 1,
        source: 'seed',
      },
    ]);
  }

  // Always ensure demo API key exists (required for /authorized/send_result testing)
  const { hashApiKey } = await import('./agentAuth.js');
  const demoKey = 'sk-synaptic-demo';
  await Agent.updateOne(
    { username: 'demo-telegram-bot' },
    {
      $set: {
        owner_email: 'demo@synaptic.uz',
        api_key_hash: hashApiKey(demoKey),
        active: true,
      },
    },
    { upsert: true }
  );
  console.log('Demo agent ready. API Key:', demoKey);

}
