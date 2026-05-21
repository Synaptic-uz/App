import { embedText, cosineSimilarity } from './embeddings.js';

const AD_BLOCKERS = [
  'kompaniya', 'kompaniyalar', 'korxona', 'korporatsiya', 'company', 'companies',
  'biznes', 'business', 'startup', 'startap', 'firmasi', 'korporativ',
  'universitet', 'university', 'o\'qish', 'oqish', 'study', 'ta\'lim', 'talim',
  'fakultet', 'abituriyent', 'magistratura', 'bakalavr', 'college',
  'viza', 'visa', 'immigratsiya', 'imtihon', 'sertifikat', 'hujjatlar',
  'yetakchi kompaniya', 'eng mashhur kompaniya', 'kompaniyalar ro\'yxati',
  'company list', 'list of companies',
  'futbol', 'football', 'soccer', 'futbolchi', 'messi', 'ronaldo', 'gol ', 'gollar',
  'chempionat', 'liga', 'sport', 'o\'yinchi', 'oyinchi', 'stadium', 'stadion',
  'basketbol', 'tennis', 'olimpiya', 'world cup', 'chempion',
];

const TRAVEL_INTENT_STRONG = [
  'sayohat', 'sayohatga', 'sayohat qilish', 'turizm', 'ta\'til', 'tatil',
  'tourism', 'travel', 'mehmonxona', 'hotel', 'chipta', 'flight', 'booking',
  'vacation', 'turar joy', 'ijaraga', 'airbnb', 'mehmonxona bron',
];

const CATEGORY_INTENT = {
  travel: TRAVEL_INTENT_STRONG,
  coffee: ['qahva', 'kofe', 'coffee', 'espresso', 'cappuccino', 'latte', 'cafe', 'ichimlik'],
  electronics: [
    'telefon', 'iphone', 'samsung', 'noutbuk', 'laptop', 'kompyuter', 'elektronika',
    'texnika', 'gadjet', 'smartphone', 'planshet', 'narxi', 'sotib ol', 'buy', 'purchase',
  ],
  food: ['ovqat', 'taom', 'yetkazib', 'delivery', 'restaurant', 'pizza', 'sushi', 'buyurtma'],
  fashion: ['kiyim', 'moda', 'fashion', 'oyoq kiyim', 'dress', 'style', 'kechak', 'krossovka', 'shirt'],
  finance: ['kredit', "bo'lib to'lash", 'muddatli tolov', 'installment', '0%', 'zood'],
};

const CATEGORY_TO_TOPIC = {
  travel: 'travel',
  coffee: 'coffee',
  electronics: 'electronics',
  food: 'food',
  fashion: 'fashion',
  finance: 'finance',
  coding: 'electronics',
};

/** Minimum score to return a match (keyword-led; blocks random vector-only ads) */
const MIN_MATCH_SCORE = 0.42;

export function shouldBlockAds(prompt) {
  if (hasTravelIntent(prompt)) return false;
  const lower = prompt.toLowerCase();
  return AD_BLOCKERS.some((phrase) => lower.includes(phrase));
}

export function hasTravelIntent(prompt) {
  const lower = prompt.toLowerCase();
  return TRAVEL_INTENT_STRONG.some((phrase) => lower.includes(phrase));
}

export function hasCategoryIntent(prompt, campaignTopic) {
  const signals = CATEGORY_INTENT[campaignTopic];
  if (!signals) return false;
  const lower = prompt.toLowerCase();
  return signals.some((phrase) => lower.includes(phrase));
}

export function detectTopics(prompt) {
  if (shouldBlockAds(prompt)) return {};

  const lower = prompt.toLowerCase();
  const scores = {};

  for (const [topic, keywords] of Object.entries(CATEGORY_INTENT)) {
    if (topic === 'travel' && !hasTravelIntent(prompt)) continue;
    let hits = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) hits++;
    }
    if (hits > 0) scores[topic] = hits;
  }

  return scores;
}

export function getDominantTopic(topicScores) {
  const entries = Object.entries(topicScores);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function countKeywordMatches(prompt, campaign) {
  const lower = prompt.toLowerCase();
  let matches = 0;
  for (const kw of campaign.keywords || []) {
    const k = kw.toLowerCase().trim();
    if (k.length >= 3 && lower.includes(k)) matches++;
  }
  return matches;
}

function isActiveCampaign(campaign) {
  return campaign.active !== 0 && campaign.active !== false;
}

/**
 * Match flow:
 * 1. Block informational/sports prompts
 * 2. Require campaign keyword hit in the user's message (no vector-only guesses)
 * 3. Require topic alignment (user intent vs campaign category)
 * 4. Pick highest score; ties broken by more keyword hits
 */
export async function findBestCampaign(prompt, campaigns) {
  if (!campaigns?.length) {
    return { campaign: null, score: -1, method: 'no-campaigns' };
  }

  if (shouldBlockAds(prompt)) {
    return { campaign: null, score: -1, method: 'blocked-informational' };
  }

  const topicScores = detectTopics(prompt);
  const dominantTopic = getDominantTopic(topicScores);

  let promptEmbedding = null;
  try {
    const needsEmbed = campaigns.some((c) => isActiveCampaign(c) && c.embedding?.length > 0);
    if (needsEmbed) promptEmbedding = await embedText(prompt);
  } catch (err) {
    console.error('Embedding skipped for matching:', err.message);
  }

  const candidates = [];

  for (const campaign of campaigns) {
    if (!isActiveCampaign(campaign)) continue;

    const campaignTopic = CATEGORY_TO_TOPIC[campaign.category] || campaign.category;
    const keywordMatches = countKeywordMatches(prompt, campaign);

    if (keywordMatches < 1) continue;

    if (campaignTopic === 'travel' && !hasTravelIntent(prompt)) continue;

    if (dominantTopic) {
      if (campaignTopic !== dominantTopic) continue;
    } else if (!hasCategoryIntent(prompt, campaignTopic)) {
      continue;
    }

    let vectorScore = 0;
    if (promptEmbedding && campaign.embedding?.length > 0) {
      vectorScore = cosineSimilarity(promptEmbedding, campaign.embedding);
    }

    const score = keywordMatches * 0.4 + vectorScore * 0.35 + (dominantTopic === campaignTopic ? 0.25 : 0.1);

    candidates.push({
      campaign,
      score,
      keywordMatches,
      vectorScore,
      campaignTopic,
      method: 'keyword-led',
    });
  }

  if (candidates.length === 0) {
    return { campaign: null, score: -1, method: 'no-keyword-match', dominantTopic };
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.keywordMatches !== a.keywordMatches) return b.keywordMatches - a.keywordMatches;
    return (b.campaign.cpc_rate || 0) - (a.campaign.cpc_rate || 0);
  });

  const best = candidates[0];
  if (best.score < MIN_MATCH_SCORE) {
    return { campaign: null, score: best.score, method: 'below-threshold', dominantTopic };
  }

  return {
    campaign: best.campaign,
    score: best.score,
    method: best.method,
    dominantTopic,
    keywordMatches: best.keywordMatches,
  };
}
