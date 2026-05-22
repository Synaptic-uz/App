import { embedText, cosineSimilarity } from './embeddings.js';
import { rankAndSelect, recordImpression, RANKING_CONFIG } from './adRanking.js';
import { detectPromptIntent, isOtherCategory } from './categories.js';

const MIN_MATCH_SCORE = 0.2;

export { RANKING_CONFIG };

/** Simple mode: no company-list / sports blocking — match on keywords only. */
export function shouldBlockAds() {
  return false;
}

export function hasTravelIntent(prompt) {
  const lower = prompt.toLowerCase();
  const travel = [
    'sayohat', 'turizm', "ta'til", 'travel', 'mehmonxona', 'hotel', 'chipta', 'vacation',
  ];
  return travel.some((phrase) => lower.includes(phrase));
}

function isActiveCampaign(campaign) {
  return campaign.active !== 0 && campaign.active !== false;
}

function phraseHits(lower, phrases) {
  let n = 0;
  for (const p of phrases || []) {
    const t = p.toLowerCase().trim();
    if (t.length >= 3 && lower.includes(t)) n++;
  }
  return n;
}

function customCategoryScore(lower, campaign) {
  if (!isOtherCategory(campaign.category) || !campaign.custom_category) return 0;
  const label = campaign.custom_category.toLowerCase().trim();
  if (label.length >= 3 && lower.includes(label)) return 0.5;
  const words = label.split(/\s+/).filter((w) => w.length >= 3);
  let hits = 0;
  for (const w of words) {
    if (lower.includes(w)) hits++;
  }
  return Math.min(0.45, hits * 0.2);
}

function profileTextScore(lower, campaign) {
  const blob = [campaign.tagline, campaign.description, campaign.name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (!blob.trim()) return 0;

  let hits = 0;
  const words = blob.split(/\s+/).filter((w) => w.length >= 3);
  for (const w of words) {
    if (lower.includes(w)) hits++;
  }
  return Math.min(1, hits / 4);
}

/**
 * Simple keyword-first matching: prompt words vs campaign keywords/niche/tagline.
 * No subcategory gates or company-list blocking.
 */
export async function findMatchingCandidates(prompt, campaigns) {
  if (!campaigns?.length) {
    return { candidates: [], intent: null, method: 'no-campaigns' };
  }

  const lower = prompt.toLowerCase();
  const intent = detectPromptIntent(prompt);

  let promptEmbedding = null;
  try {
    const needsEmbed = campaigns.some((c) => isActiveCampaign(c) && c.embedding?.length > 0);
    if (needsEmbed && process.env.GITHUB_TOKEN) {
      promptEmbedding = await embedText(prompt);
    }
  } catch (err) {
    console.warn('Embedding skipped for matching:', err.message);
  }

  const candidates = [];

  for (const campaign of campaigns) {
    if (!isActiveCampaign(campaign)) continue;

    const kwHits = phraseHits(lower, campaign.keywords);
    const nicheHits = phraseHits(lower, campaign.niche_keywords);
    const taglineScore = profileTextScore(lower, campaign);
    const customScore = customCategoryScore(lower, campaign);
    const textHits = kwHits + nicheHits;

    if (textHits === 0 && taglineScore < 0.12 && customScore < 0.12) continue;

    let vectorScore = 0;
    if (promptEmbedding && campaign.embedding?.length > 0) {
      vectorScore = cosineSimilarity(promptEmbedding, campaign.embedding);
    }

    let relevance =
      Math.min(1, textHits * 0.22) +
      taglineScore * 0.2 +
      customScore * 0.25 +
      vectorScore * 0.2;

    if (textHits > 0) {
      relevance = Math.max(relevance, MIN_MATCH_SCORE + 0.08 * textHits);
    }

    if (relevance < MIN_MATCH_SCORE) continue;

    candidates.push({
      campaign,
      relevance,
      score: relevance,
      keywordMatches: kwHits,
      nicheMatches: nicheHits,
      taglineScore,
      vectorScore,
      intent,
      method: 'simple-keyword',
    });
  }

  return {
    candidates,
    intent,
    dominantTopic: intent.subcategory ? `${intent.category}/${intent.subcategory}` : intent.category,
    method: candidates.length ? 'simple-keyword' : 'no-match',
  };
}

export async function findBestCampaign(prompt, campaigns, options = {}) {
  const { servingContext, recordServe = true } = options;
  const { candidates, intent, dominantTopic, method: poolMethod } = await findMatchingCandidates(prompt, campaigns);

  if (candidates.length === 0) {
    return { campaign: null, score: -1, method: poolMethod, dominantTopic, intent };
  }

  const { selected, candidates: rankedPool, method: rankMethod } = rankAndSelect(candidates, servingContext);

  if (!selected) {
    return { campaign: null, score: -1, method: rankMethod || poolMethod, dominantTopic, intent };
  }

  if (recordServe) {
    recordImpression(servingContext, selected.campaign);
  }

  return {
    campaign: selected.campaign,
    score: selected.relevance,
    hybridScore: selected.hybridScore,
    method: `${poolMethod}+${rankMethod}`,
    dominantTopic,
    intent,
    keywordMatches: selected.keywordMatches,
    nicheMatches: selected.nicheMatches,
    candidateCount: candidates.length,
    rankedPoolSize: rankedPool?.length ?? 0,
  };
}
