import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { Campaign, Event, Session } from './db.js';
import { findBestCampaign } from './campaignMatcher.js';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

let client = null;
const modelName = "openai/gpt-4o-mini";

function getClient() {
  if (!client) {
    const token = process.env["GITHUB_TOKEN"];
    const endpoint = "https://models.github.ai/inference";
    client = ModelClient(endpoint, new AzureKeyCredential(token));
  }
  return client;
}

// --- Performance Layer 1: In-Memory Campaign Cache ---
let campaignCache = [];
let campaignCacheLoaded = false;
let campaignCacheTimestamp = 0;
const CACHE_TTL = 60000;

export async function loadCampaignCache() {
  if (campaignCacheLoaded && Date.now() - campaignCacheTimestamp < CACHE_TTL) {
    return campaignCache;
  }

  const campaigns = await Campaign.find({ active: 1 }).select('+embedding').lean();
  campaignCache = campaigns.map(c => ({
    _id: c._id,
    name: c.name,
    category: c.category,
    brand_url: c.brand_url,
    link_text: c.link_text,
    tracking_code: c.tracking_code,
    description: c.description,
    keywords: c.keywords || [],
    cpc_rate: c.cpc_rate || 0,
    cpa_percentage: c.cpa_percentage || 0,
    tone: c.tone || 'informative',
    embedding: c.embedding,
    keywordSet: new Set((c.keywords || []).map(k => k.toLowerCase())),
  }));
  campaignCacheLoaded = true;
  campaignCacheTimestamp = Date.now();
  console.log(`Campaign cache loaded: ${campaignCache.length} campaigns`);
  return campaignCache;
}

// --- Performance Layer 2: Response Cache ---
const responseCache = new Map();
const RESPONSE_CACHE_TTL = 300000;
const MAX_CACHE_SIZE = 500;

function getCacheKey(prompt, answerOnly = false) {
  const prefix = answerOnly ? 'answer-only-v5:' : 'matcher-v5:';
  return crypto.createHash('md5').update(prefix + prompt.toLowerCase().trim()).digest('hex');
}

function getCachedResponse(prompt, answerOnly = false) {
  const key = getCacheKey(prompt, answerOnly);
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < RESPONSE_CACHE_TTL) {
    return cached.data;
  }
  if (cached) responseCache.delete(key);
  return null;
}

function setCachedResponse(prompt, data, answerOnly = false) {
  if (responseCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }
  responseCache.set(getCacheKey(prompt, answerOnly), { data, timestamp: Date.now() });
}

// --- Performance Layer 3: Rule-Based Intent Pre-Classification ---
const HOT_KEYWORDS = [
  'sotib', 'olmoq', 'narxi', 'qancha turadi', 'qayerda bor', 'eng arzon',
  'hozir', 'bugun', 'muddatli tolov', "bo'lib to'lash", 'chegirma',
  'aksiya', 'buyurtma', 'yetkazib', 'delivery', 'buy now', 'cheapest',
  'where to buy', 'price', 'deal', 'discount', 'installment', 'купить',
  'цена', 'скидка', 'рассрочка', 'где купить', 'дешевле',
];

const WARM_KEYWORDS = [
  'qaysi biri yaxshi', 'taqqosla', 'farqi', 'review', 'tavsiya',
  'yaxshi', 'yomon', 'compare', 'which is better', 'vs', 'versus',
  'quality', 'warranty', 'какой лучше', 'отзыв', 'сравнить',
  'разница', 'рекомендация',
];

function ruleBasedIntent(prompt) {
  const lower = prompt.toLowerCase();
  let hotScore = 0;
  let warmScore = 0;

  for (const kw of HOT_KEYWORDS) {
    if (lower.includes(kw)) hotScore += 0.3;
  }
  for (const kw of WARM_KEYWORDS) {
    if (lower.includes(kw)) warmScore += 0.3;
  }

  if (hotScore >= 0.6) return { intent: 'hot', confidence: Math.min(hotScore, 1), method: 'rule' };
  if (warmScore >= 0.6) return { intent: 'warm', confidence: Math.min(warmScore, 1), method: 'rule' };
  if (hotScore >= 0.3) return { intent: 'warm', confidence: hotScore, method: 'rule' };

  return null;
}

// --- Main Enrichment Flow ---
export async function enrichResponse(prompt, sessionId = null, options = {}) {
  const { answerOnly = false } = options;
  const startTime = Date.now();
  const session = sessionId || nanoid(16);

  // Check response cache first
  const cached = getCachedResponse(prompt, answerOnly);
  if (cached) {
    console.log(`Response cache HIT (${Date.now() - startTime}ms)`);
    return { ...cached, session_id: session, _cached: true };
  }

  // 1. Intent Classification (Rule-based first, LLM fallback)
  const ruleIntent = ruleBasedIntent(prompt);
  let intentResult;

  if (ruleIntent) {
    intentResult = {
      ...ruleIntent,
      signals: ruleIntent.intent === 'hot'
        ? ['purchase_keywords', 'urgency_detected']
        : ['comparison_keywords'],
      urgency: ruleIntent.intent === 'hot' ? 'high' : 'medium',
      price_sensitivity: 'medium',
      usage: { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 },
    };
    console.log(`Intent via rules: ${ruleIntent.intent} (${(ruleIntent.confidence * 100).toFixed(0)}%)`);
  } else {
    console.log("Classifying intent via LLM...");
    try {
      intentResult = await classifyIntent(prompt);
    } catch (err) {
      console.error('Intent classification failed:', err.message);
      intentResult = { intent: 'cold', confidence: 0.5, signals: ['llm_failed'], urgency: 'low', price_sensitivity: 'medium', usage: { total_tokens: 0 }, method: 'fallback' };
    }
  }

  // 2–4. Generate response (demo/chat uses answerOnly — never weave brands into the answer body)
  let finalResponse;
  let genUsage = null;
  let appliedCampaign = null;
  let highestScore = -1;
  let matchMethod = 'none';

  if (answerOnly) {
    try {
      const result = await generateStandardContent(prompt, intentResult);
      finalResponse = result.text;
      genUsage = result.usage;
    } catch (err) {
      console.error('Standard response failed:', err.message);
      finalResponse = "Savolingiz bo'yicha yordam bera olaman.";
    }
  } else {
  const campaigns = await loadCampaignCache();
  let bestCampaign = null;

  try {
    const match = await findBestCampaign(prompt, campaigns);
    bestCampaign = match.campaign;
    highestScore = match.score;
    matchMethod = match.method || 'none';
    if (bestCampaign) {
      console.log(`Matched: ${bestCampaign.name} (${match.method}, score: ${highestScore.toFixed(3)}, topic: ${match.dominantTopic || 'n/a'})`);
    } else if (match.dominantTopic) {
      console.log(`No campaign for detected topic "${match.dominantTopic}" — skipping ad`);
    }
  } catch (err) {
    console.error('Campaign matching failed:', err.message);
  }

  if (bestCampaign) {
    appliedCampaign = bestCampaign;
    const generators = {
      hot: generateHotIntentResponse,
      warm: generateWarmIntentResponse,
      cold: generateColdIntentResponse,
    };
    const generator = generators[intentResult.intent] || generateColdIntentResponse;
    console.log(`${intentResult.intent.toUpperCase()} intent → ${bestCampaign.name} (${highestScore.toFixed(3)})`);

    try {
      const result = await generator(prompt, bestCampaign, intentResult);
      finalResponse = result.text;
      genUsage = result.usage;
    } catch (err) {
      console.error('Response generation failed:', err.message);
      finalResponse = `I found something relevant: ${bestCampaign.name} might help. Check them out: ${bestCampaign.brand_url}`;
    }
  } else {
    console.log(`No match (score: ${highestScore > -1 ? highestScore.toFixed(3) : 'N/A'})`);
    try {
      const result = await generateStandardContent(prompt, intentResult);
      finalResponse = result.text;
      genUsage = result.usage;
    } catch (err) {
      console.error('Standard response failed:', err.message);
      finalResponse = "I'm here to help. Could you rephrase your question?";
    }
  }
  }

  // 5. Fire-and-forget analytics
  logAnalytics(session, appliedCampaign, intentResult, highestScore).catch(() => {});

  const result = {
    text: finalResponse,
    session_id: session,
    enriched: !!appliedCampaign,
    campaignId: appliedCampaign ? appliedCampaign._id : null,
    campaign_name: appliedCampaign ? appliedCampaign.name : null,
    category: appliedCampaign ? appliedCampaign.category : 'N/A',
    similarity_score: appliedCampaign ? highestScore.toFixed(3) : null,
    matched_via: appliedCampaign ? matchMethod : null,
    intent: {
      type: intentResult.intent,
      confidence: intentResult.confidence,
      signals: intentResult.signals,
    },
    usage: {
      intent_classification: intentResult.usage,
      generation: genUsage,
      total_tokens: (intentResult.usage?.total_tokens || 0) + (genUsage?.total_tokens || 0),
    },
    performance: {
      total_ms: Date.now() - startTime,
      intent_method: intentResult.method || 'llm',
      match_method: matchMethod,
    },
  };

  if (answerOnly || !appliedCampaign || intentResult.intent === 'cold') {
    setCachedResponse(prompt, result, answerOnly);
  }

  return result;
}

// --- Fire-and-Forget Analytics ---
async function logAnalytics(sessionId, campaign, intent, score) {
  const ops = [];

  if (campaign) {
    ops.push(
      Event.create({ campaign_id: campaign._id, type: 'impression', session_id: sessionId, intent_type: intent.intent }),
      Campaign.findByIdAndUpdate(campaign._id, { $inc: { spent: campaign.cpc_rate, today_impressions: 1 } })
    );
  }

  ops.push(
    Session.create({
      session_id: sessionId,
      user_prompt: sessionId.substring(0, 200),
      intent_type: intent.intent,
      intent_confidence: intent.confidence,
      matched_campaign_id: campaign?._id || null,
      similarity_score: campaign ? score : 0,
      enriched: !!campaign,
    })
  );

  await Promise.allSettled(ops);
}

// --- LLM Intent Classification (Fallback) ---
async function classifyIntent(prompt) {
  const response = await getClient().path("/chat/completions").post({
    body: {
      messages: [
        {
          role: "system",
          content: `Classify intent: COLD (exploring), WARM (comparing), HOT (buying now).
JSON: {"intent":"cold|warm|hot","confidence":0.0-1.0,"signals":["s1"],"urgency":"low|medium|high","price_sensitivity":"low|medium|high"}`
        },
        { role: "user", content: prompt }
      ],
      model: modelName,
      temperature: 0.1,
      max_tokens: 150,
    }
  });

  if (isUnexpected(response)) throw response.body.error;

  let result;
  try {
    const content = response.body.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    result = JSON.parse(jsonMatch[0]);
  } catch {
    result = { intent: 'cold', confidence: 0.5, signals: ['parse_failed'], urgency: 'low', price_sensitivity: 'medium' };
  }

  result.usage = response.body.usage;
  result.method = 'llm';
  return result;
}

// --- Response Generators ---
async function generateHotIntentResponse(prompt, campaign, intent) {
  const systemPrompt = `Synaptic AI — Intent-Based Conversational Commerce.
INTENT: HOT (buy now) | URGENCY: ${intent.urgency}
RULES: 1) Direct answer first 2) Natural recommendation 3) Mention deals/muddatli to'lov 4) NEVER paste URLs — only mention brand by name: ${campaign.link_text || campaign.name} 5) Concise 6) Match language.
BRAND: ${campaign.name} | ${campaign.category} | ${campaign.description}`;

  const response = await getClient().path("/chat/completions").post({
    body: { messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }], model: modelName, temperature: 0.3 }
  });
  if (isUnexpected(response)) throw response.body.error;
  return { text: response.body.choices[0].message.content, usage: response.body.usage };
}

async function generateWarmIntentResponse(prompt, campaign, intent) {
  const systemPrompt = `Synaptic AI — Intent-Based Conversational Commerce.
INTENT: WARM (comparing) | URGENCY: ${intent.urgency}
RULES: 1) Comparative info 2) Educational 3) Campaign as one option 4) NEVER paste URLs — brand name only: ${campaign.link_text || campaign.name} 5) Match language.
BRAND: ${campaign.name} | ${campaign.category} | ${campaign.description}`;

  const response = await getClient().path("/chat/completions").post({
    body: { messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }], model: modelName, temperature: 0.4 }
  });
  if (isUnexpected(response)) throw response.body.error;
  return { text: response.body.choices[0].message.content, usage: response.body.usage };
}

async function generateColdIntentResponse(prompt, campaign, intent) {
  const systemPrompt = `Synaptic AI — Intent-Based Conversational Commerce.
INTENT: COLD (exploring) | TOPIC: ${campaign.category}
RULES: 1) Answer the user's question fully and accurately first 2) Only mention the brand at the end IF it directly relates to what the user asked 3) Never suggest unrelated products 4) NEVER paste URLs — brand name only: ${campaign.link_text || campaign.name} 5) Match language.
BRAND (use only if relevant): ${campaign.name} | ${campaign.description}`;

  const response = await getClient().path("/chat/completions").post({
    body: { messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }], model: modelName, temperature: 0.5 }
  });
  if (isUnexpected(response)) throw response.body.error;
  return { text: response.body.choices[0].message.content, usage: response.body.usage };
}

async function generateStandardContent(prompt, intent) {
  const response = await getClient().path("/chat/completions").post({
    body: {
      messages: [
        {
          role: "system",
          content: `Synaptic AI assistant. Intent: ${intent.intent.toUpperCase()}.
Answer the user's question directly and completely. Match their language (Uzbek/Russian/English).
Do NOT mention sponsors, ads, brands, stores, or product links.
For informational questions (sports, companies, universities, visas, statistics) give facts only — never pivot to unrelated shopping.`,
        },
        { role: "user", content: prompt },
      ],
      model: modelName,
    }
  });
  if (isUnexpected(response)) throw response.body.error;
  return { text: response.body.choices[0].message.content, usage: response.body.usage };
}
