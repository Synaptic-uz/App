import mongoose from 'mongoose';
import { embedText } from './embeddings.js';

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/synaptic-ai';

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(URI, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    });
    isConnected = true;
    console.log("Connected to MongoDB via Mongoose (pool: 20)");
    await seedDatabase();
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
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
}, { timestamps: true });

campaignSchema.index({ active: 1 });
campaignSchema.index({ category: 1 });
campaignSchema.index({ source: 1 });

export const Campaign = mongoose.model('Campaign', campaignSchema);

const eventSchema = new mongoose.Schema({
  campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
  agent_id: { type: String, default: null, index: true },
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

async function seedDatabase() {
  const count = await Campaign.countDocuments();
  if (count === 0) {
    console.log("Seeding campaigns with Uzbekistan market data...");

    const embedCoffee = await embedText("coffee beans brewing espresso cappuccino latte cafe beverage drink roasting qahva ichimlik");
    const embedTech = await embedText("laptop noutbuk computer telefon smartphone iPhone Samsung electronics texnika gadjet");
    const embedTravel = await embedText("travel flights hotels vacation sightseeing tourism booking sayohat chipta mehmonxona");
    const embedFashion = await embedText("fashion clothing kiyim shoes oyoq kiyim dress moda style fashion trend");
    const embedFinance = await embedText("finance credit loan muddatli tolov installment payment bank kredit pul money");
    const embedFood = await embedText("food delivery yetkazib berish pizza sushi restaurant ovqat taom fast food");

    await Campaign.insertMany([
      {
        name: 'Uzum Market',
        category: 'electronics',
        brand_url: 'https://uzum.market',
        link_text: 'Uzum Market',
        tagline: "O'zbekistonning eng yirik marketplace — muddatli to'lov va bepul yetkazish bilan",
        tracking_code: 'uzum-electronics-001',
        embedding: embedTech,
        description: "O'zbekistonning eng yirik onlayn marketplace. Elektronika, kiyim, uy jihozlari va boshqa ko'plab mahsulotlar.",
        keywords: ['noutbuk', 'telefon', 'iPhone', 'Samsung', 'elektronika', 'laptop', 'texnika', 'gadjet'],
        cpc_rate: 500,
        cpa_rate: 0,
        cpa_percentage: 3,
        tone: 'deal-focused',
        source: 'partner',
        budget: 1000000,
        spent: 0,
        max_daily_impressions: 5000,
      },
      {
        name: 'Olcha Market',
        category: 'electronics',
        brand_url: 'https://olcha.uz',
        link_text: 'Olcha Market',
        tagline: "Texnika va elektronika do'koni — muddatli to'lov imkoniyati bilan",
        tracking_code: 'olcha-electronics-002',
        embedding: embedTech,
        description: "Texnika va elektronika do'koni. Muddatli to'lov imkoniyati bilan.",
        keywords: ['noutbuk', 'kompyuter', 'telefon', 'muddatli tolov', 'texnika', 'iPhone'],
        cpc_rate: 400,
        cpa_rate: 0,
        cpa_percentage: 2.5,
        tone: 'comparative',
        source: 'partner',
        budget: 800000,
        spent: 0,
        max_daily_impressions: 3000,
      },
      {
        name: 'Blue Bottle Coffee',
        category: 'coffee',
        brand_url: 'https://www.bluebottlecoffee.com',
        link_text: 'Blue Bottle',
        tagline: "Premium coffee beans and brewing equipment delivered to your door",
        tracking_code: 'bb-coffee-123',
        embedding: embedCoffee,
        description: "Premium coffee beans and brewing equipment.",
        keywords: ['coffee', 'qahva', 'espresso', 'cappuccino', 'latte'],
        cpc_rate: 300,
        cpa_rate: 0,
        cpa_percentage: 5,
        tone: 'informative',
        source: 'seed',
        budget: 500000,
        spent: 0,
        max_daily_impressions: 2000,
      },
      {
        name: 'DigitalOcean',
        category: 'coding',
        brand_url: 'https://www.digitalocean.com',
        link_text: 'DigitalOcean',
        tagline: "Cloud hosting and developer infrastructure — start free today",
        tracking_code: 'do-cloud-456',
        embedding: embedTech,
        description: "Cloud hosting and developer infrastructure.",
        keywords: ['coding', 'cloud', 'hosting', 'server', 'developer'],
        cpc_rate: 1000,
        cpa_rate: 0,
        cpa_percentage: 10,
        tone: 'informative',
        source: 'seed',
        budget: 2000000,
        spent: 0,
        max_daily_impressions: 5000,
      },
      {
        name: 'Airbnb',
        category: 'travel',
        brand_url: 'https://www.airbnb.com',
        link_text: 'Airbnb',
        tagline: "Worldwide vacation rentals — find your next adventure",
        tracking_code: 'ab-travel-789',
        embedding: embedTravel,
        description: "Worldwide vacation rentals and experiences.",
        keywords: ['travel', 'hotel', 'vacation', 'sayohat', 'mehmonxona'],
        cpc_rate: 800,
        cpa_rate: 0,
        cpa_percentage: 4,
        tone: 'promotional',
        source: 'seed',
        budget: 1500000,
        spent: 0,
        max_daily_impressions: 4000,
      },
      {
        name: 'ZoodMall',
        category: 'finance',
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
    console.log("Seed data with Uzbekistan market campaigns created.");
  }

  // Seed a demo agent if none exists
  const agentCount = await Agent.countDocuments();
  if (agentCount === 0) {
    const { hashApiKey, generateApiKey } = await import('./agentAuth.js');
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);

    await Agent.create({
      username: 'demo-telegram-bot',
      owner_email: 'demo@synaptic.uz',
      api_key_hash: keyHash,
      active: true,
    });

    console.log("Demo agent created. API Key:", apiKey);
    console.log("Store this key — it won't be shown again.");
  }
}
