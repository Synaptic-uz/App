import crypto from "node:crypto";
if (!globalThis.crypto) globalThis.crypto = crypto;

import mongoose from "mongoose";
import { embedText } from "./embeddings.js";
import { buildCampaignProfileText, defaultSubcategory } from "./categories.js";

const URI = process.env.MONGODB_URI || "mongodb://localhost:27017/synaptic-ai";

let isConnected = false;

export function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export async function connectDB() {
  if (isConnected) return true;
  try {
    await mongoose.connect(URI, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 120000,
    });
    isConnected = true;
    console.log("Connected to MongoDB via Mongoose (pool: 20)");
    return true;
  } catch (error) {
    isConnected = false;
    console.error("MongoDB connection error:", error.message || error);
    if (error.reason) console.error("  reason:", error.reason);
    throw error;
  }
}

/** Seed/migrate — invoked from background job queue, not blocking HTTP listen. */
export async function seedDatabaseIfNeeded() {
  if (process.env.SKIP_DB_SEED === "1" || process.env.SKIP_DB_SEED === "true") {
    console.log("SKIP_DB_SEED set — skipping database seed/migrations");
    return;
  }
  await seedDatabase();
}

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    subcategory: { type: String, default: "general" },
    custom_category: { type: String, default: "" },
    niche_keywords: { type: [String], default: [] },
    brand_url: { type: String, required: true },
    link_text: { type: String, required: true },
    tagline: { type: String, default: "" },
    tracking_code: { type: String, required: true, unique: true },
    active: { type: Number, default: 1 },
    embedding: { type: [Number], required: false },
    description: { type: String, default: "" },
    keywords: { type: [String], default: [] },
    cpc_rate: { type: Number, default: 0 },
    cpa_rate: { type: Number, default: 0 },
    cpa_percentage: { type: Number, default: 0 },
    tone: {
      type: String,
      enum: ["informative", "promotional", "comparative", "deal-focused"],
      default: "informative",
    },
    source: {
      type: String,
      enum: ["partner", "scraped", "seed"],
      default: "seed",
    },
    budget: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    max_daily_impressions: { type: Number, default: 1000 },
    today_impressions: { type: Number, default: 0 },
    last_reset_date: { type: Date, default: Date.now },
    stats_impressions: { type: Number, default: 0 },
    stats_clicks: { type: Number, default: 0 },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    offerings: {
      type: [
        {
          name: { type: String, required: true },
          type: {
            type: String,
            enum: ["product", "service"],
            default: "product",
          },
          description: { type: String, default: "" },
          url: { type: String, default: "" },
          price_hint: { type: String, default: "" },
          keywords: { type: [String], default: [] },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

campaignSchema.index({ active: 1 });
campaignSchema.index({ category: 1 });
campaignSchema.index({ source: 1 });

export const Campaign = mongoose.model("Campaign", campaignSchema);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["business", "agent"], required: true },
    display_name: { type: String, default: "" },
    company_name: { type: String, default: "" },
    phone: { type: String, default: "" },
    wallet_balance: { type: Number, default: 0 },
    refresh_token_hash: { type: String, default: null },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);

const eventSchema = new mongoose.Schema(
  {
    campaign_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      index: true,
    },
    agent_id: { type: String, default: null, index: true },
    session_id: { type: String, default: null, index: true },
    intent_type: { type: String, default: null },
    type: {
      type: String,
      enum: ["impression", "click", "conversion"],
      required: true,
    },
    user_prompt: { type: String, default: null },
    conversion_value: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

eventSchema.index({ campaign_id: 1, type: 1 });
eventSchema.index({ agent_id: 1, type: 1 });
eventSchema.index({ createdAt: -1 });

export const Event = mongoose.model("Event", eventSchema);

const agentSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    owner_email: { type: String, required: true },
    api_key_hash: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
    total_requests: { type: Number, default: 0 },
    total_impressions: { type: Number, default: 0 },
    total_clicks: { type: Number, default: 0 },
    revenue_earned: { type: Number, default: 0 },
    last_seen: { type: Date },
  },
  { timestamps: true },
);

agentSchema.index({ active: 1 });

export const Agent = mongoose.model("Agent", agentSchema);

const sessionSchema = new mongoose.Schema(
  {
    session_id: { type: String, required: true, unique: true },
    user_prompt: { type: String, required: true },
    intent_type: {
      type: String,
      enum: ["cold", "warm", "hot"],
      default: "cold",
    },
    intent_confidence: { type: Number, default: 0 },
    matched_campaign_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
    },
    similarity_score: { type: Number, default: 0 },
    enriched: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

sessionSchema.index({ intent_type: 1, createdAt: -1 });
sessionSchema.index({ matched_campaign_id: 1 });

export const Session = mongoose.model("Session", sessionSchema);

/** Load impression/click totals into in-memory ranking CTR cache (pass bulkLoadCtr from adRanking). */
export async function bootstrapRankingStats(bulkLoadCtr) {
  const rows = await Campaign.find({})
    .select("_id stats_impressions stats_clicks")
    .lean();
  bulkLoadCtr(
    rows.map((r) => ({
      _id: r._id,
      impressions: r.stats_impressions || 0,
      clicks: r.stats_clicks || 0,
    })),
  );
}

export async function incrementCampaignImpression(campaignId, cpcRate = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const campaign = await Campaign.findById(campaignId)
    .select("last_reset_date today_impressions")
    .lean();
  if (!campaign) return;

  const last = campaign.last_reset_date
    ? new Date(campaign.last_reset_date)
    : null;
  const sameDay = last && last.toDateString() === today.toDateString();

  if (sameDay) {
    await Campaign.updateOne(
      { _id: campaignId },
      { $inc: { today_impressions: 1, stats_impressions: 1 } },
    );
  } else {
    await Campaign.updateOne(
      { _id: campaignId },
      {
        $set: { today_impressions: 1, last_reset_date: today },
        $inc: { stats_impressions: 1 },
      },
    );
  }
}

/** Charge CPC on click (not on impression). */
export async function incrementCampaignClick(campaignId, cpcRate = 0) {
  await Campaign.updateOne(
    { _id: campaignId },
    { $inc: { stats_clicks: 1, spent: Math.max(0, cpcRate) } },
  );
  const { pauseCampaignIfBudgetExhausted } = await import("./wallet.js");
  await pauseCampaignIfBudgetExhausted(campaignId);
}

export async function creditAgentRevenue(username, amount) {
  if (!username || amount <= 0) return;
  await Agent.updateOne(
    { username },
    { $inc: { total_clicks: 1, revenue_earned: amount } },
  );
}

async function embedForCampaign(doc) {
  return embedText(buildCampaignProfileText(doc));
}

/** Keep only UZ-market demo campaigns; deactivate legacy US/global seeds. */
async function migrateCampaignCatalog({ embeddings = false } = {}) {
  await Campaign.updateMany(
    {
      tracking_code: {
        $in: [
          "bb-coffee-123",
          "do-cloud-456",
          "ab-travel-789",
          "upg-gaming-006",
        ],
      },
    },
    { $set: { active: 0 } },
  );

  const patches = [
    {
      tracking_code: "uzum-electronics-001",
      set: {
        category: "electronics",
        subcategory: "general",
        niche_keywords: [],
        tagline:
          "O'zbekistonning eng yirik marketplace — telefon, noutbuk, muddatli to'lov",
        keywords: [
          "noutbuk",
          "telefon",
          "iphone",
          "samsung",
          "elektronika",
          "laptop",
          "texnika",
          "gadjet",
          "smartphone",
        ],
        active: 1,
      },
    },
    {
      tracking_code: "olcha-electronics-002",
      set: {
        category: "electronics",
        subcategory: "general",
        niche_keywords: [],
        tagline: "Texnika va elektronika — telefon, noutbuk, muddatli to'lov",
        keywords: [
          "noutbuk",
          "kompyuter",
          "telefon",
          "muddatli tolov",
          "texnika",
          "iphone",
          "laptop",
          "smartphone",
        ],
        active: 1,
      },
    },
    {
      tracking_code: "zood-finance-003",
      set: { category: "finance", subcategory: "installment", active: 1 },
    },
    {
      tracking_code: "yandex-food-004",
      set: { category: "food", subcategory: "delivery", active: 1 },
    },
    {
      tracking_code: "moda-fashion-005",
      set: { category: "fashion", subcategory: "general", active: 1 },
    },
  ];

  for (const { tracking_code, set } of patches) {
    const exists = await Campaign.findOne({ tracking_code });
    if (!exists) continue;

    await Campaign.updateOne({ tracking_code }, { $set: set });
    if (!embeddings || !process.env.GITHUB_TOKEN) continue;

    try {
      const merged = { ...exists.toObject(), ...set };
      const embedding = await embedForCampaign(merged);
      await Campaign.updateOne({ tracking_code }, { $set: { embedding } });
    } catch (error) {
      console.warn(
        `Embedding skipped for ${tracking_code}:`,
        error.message || error,
      );
    }
  }
}

/** Slow path: refresh demo campaign embeddings (optional startup job). */
export async function refreshStartupEmbeddings() {
  if (!process.env.GITHUB_TOKEN) {
    console.log("[embeddings] GITHUB_TOKEN yo‘q — o‘tkazildi");
    return;
  }
  console.log("[embeddings] Demo kampaniya embeddinglari yangilanmoqda…");
  await migrateCampaignCatalog({ embeddings: true });
  console.log("[embeddings] Tugadi");
}

/** Remove legacy unique index on users.username (schema no longer has username). */
async function migrateUserIndexes() {
  try {
    const indexes = await User.collection.indexes();
    const stale = indexes.find(
      (idx) =>
        idx.key && Object.prototype.hasOwnProperty.call(idx.key, "username"),
    );
    if (!stale) return;

    const indexName = stale.name || "username_1";
    await User.collection.dropIndex(indexName);
    console.log(`Dropped obsolete User index: ${indexName}`);
  } catch (error) {
    const notFound =
      error.code === 27 ||
      error.codeName === "IndexNotFound" ||
      /index not found/i.test(error.message || "");
    if (!notFound) {
      console.warn("User index migration:", error.message || error);
    }
  }
}

async function insertCoreCampaigns(docs) {
  await Campaign.insertMany(docs);
  console.log("Core campaigns seeded.");
}

async function seedDatabase() {
  console.log("[seed] migratsiya…");
  await migrateUserIndexes();
  await migrateCampaignCatalog({ embeddings: false });

  const count = await Campaign.countDocuments({ active: { $in: [1, true] } });

  if (count < 4) {
    console.log("[seed] demo kampaniyalar (embedding siz, tez)…");
    await insertCoreCampaigns([
      {
        name: "Uzum Market",
        category: "electronics",
        subcategory: "general",
        niche_keywords: [],
        brand_url: "https://uzum.market",
        link_text: "Uzum Market",
        tagline:
          "O'zbekistonning eng yirik marketplace — telefon, noutbuk, muddatli to'lov",
        tracking_code: "uzum-electronics-001",
        description: "Onlayn marketplace: telefon, noutbuk, elektronika.",
        keywords: [
          "noutbuk",
          "telefon",
          "iphone",
          "samsung",
          "elektronika",
          "laptop",
          "texnika",
          "gadjet",
        ],
        cpc_rate: 500,
        cpa_percentage: 3,
        tone: "deal-focused",
        source: "partner",
        budget: 1000000,
        active: 1,
        max_daily_impressions: 5000,
      },
      {
        name: "Olcha Market",
        category: "electronics",
        subcategory: "general",
        niche_keywords: [],
        brand_url: "https://olcha.uz",
        link_text: "Olcha Market",
        tagline: "Texnika va elektronika — telefon, noutbuk, muddatli to'lov",
        tracking_code: "olcha-electronics-002",
        description: "Texnika va elektronika do'koni.",
        keywords: [
          "noutbuk",
          "kompyuter",
          "telefon",
          "muddatli tolov",
          "texnika",
          "iphone",
          "laptop",
        ],
        cpc_rate: 400,
        cpa_percentage: 2.5,
        tone: "comparative",
        source: "partner",
        budget: 800000,
        active: 1,
        max_daily_impressions: 3000,
      },
      {
        name: "ZoodMall",
        category: "finance",
        subcategory: "installment",
        niche_keywords: [],
        brand_url: "https://zoodmall.com",
        link_text: "ZoodMall",
        tagline:
          "0% ustama bilan 6-12 oyga bo'lib to'lash — hoziroq xarid qiling",
        tracking_code: "zood-finance-003",
        description: "Muddatli to'lov bilan xarid qilish platformasi.",
        keywords: [
          "muddatli tolov",
          "kredit",
          "bo'lib to'lash",
          "installment",
          "0%",
        ],
        cpc_rate: 600,
        cpa_percentage: 5,
        tone: "deal-focused",
        source: "partner",
        budget: 1200000,
        active: 1,
        max_daily_impressions: 4000,
      },
      {
        name: "Yandex Eats",
        category: "food",
        subcategory: "delivery",
        niche_keywords: [],
        brand_url: "https://eda.yandex.uz",
        link_text: "Yandex Eats",
        tagline:
          "Tezkor yetkazib berish — eng yaxshi restaurantlardan buyurtma qiling",
        tracking_code: "yandex-food-004",
        description: "Tezkor yetkazib berish xizmati.",
        keywords: [
          "yetkazib berish",
          "delivery",
          "ovqat",
          "pizza",
          "sushi",
          "taom",
        ],
        cpc_rate: 350,
        cpa_percentage: 8,
        tone: "deal-focused",
        source: "partner",
        budget: 700000,
        active: 1,
        max_daily_impressions: 3000,
      },
      {
        name: "Moda.uz",
        category: "fashion",
        subcategory: "general",
        niche_keywords: [],
        brand_url: "https://moda.uz",
        link_text: "Moda.uz",
        tagline:
          "O'zbekistondagi eng katta moda do'koni — trend kiyimlar va oyoq kiyimlar",
        tracking_code: "moda-fashion-005",
        description: "Moda va kiyim-kechak onlayn do'koni.",
        keywords: ["kiyim", "moda", "fashion", "oyoq kiyim", "dress", "style"],
        cpc_rate: 250,
        cpa_percentage: 4,
        tone: "promotional",
        source: "partner",
        budget: 500000,
        active: 1,
        max_daily_impressions: 2500,
      },
    ]);
  }

  console.log("[seed] demo agent…");
  const { hashApiKey } = await import("./agentAuth.js");
  const demoKey = "sk-synaptic-demo";
  await Agent.updateOne(
    { username: "demo-telegram-bot" },
    {
      $set: {
        owner_email: "demo@synaptic.uz",
        api_key_hash: hashApiKey(demoKey),
        active: true,
      },
    },
    { upsert: true },
  );
  console.log("Demo agent ready. API Key:", demoKey);
  console.log("[seed] tez qism tugadi");
}
