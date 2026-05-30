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

function offeringHits(lower, offerings) {
  let n = 0;
  for (const o of offerings || []) {
    const name = String(o.name || '').toLowerCase().trim();
    if (name.length >= 3 && lower.includes(name)) n++;
    n += phraseHits(lower, o.keywords);
    const desc = String(o.description || '').toLowerCase();
    if (desc.length >= 8) {
      const words = desc.split(/\s+/).filter((w) => w.length >= 4).slice(0, 6);
      for (const w of words) {
        if (lower.includes(w)) n += 0.25;
      }
    }
  }
  return Math.floor(n);
}

function profileTextScore(lower, campaign) {
  const offeringBlob = (campaign.offerings || [])
    .map((o) => [o.name, o.description, ...(o.keywords || [])].join(' '))
    .join(' ');
  const blob = [campaign.tagline, campaign.description, campaign.name, offeringBlob]
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
export async function findMatchingCandidates(prompt, campaigns, options = {}) {
  if (!campaigns?.length) {
    return { candidates: [], intent: null, method: 'no-campaigns' };
  }

  const matchText = options.matchPrompt || prompt;
  const lower = matchText.toLowerCase();
  const intent = detectPromptIntent(matchText);

  let promptEmbedding = null;
  try {
    const needsEmbed = campaigns.some((c) => isActiveCampaign(c) && c.embedding?.length > 0);
    if (needsEmbed && process.env.GITHUB_TOKEN) {
      promptEmbedding = await embedText(matchText);
    }
  } catch (err) {
    console.warn('Embedding skipped for matching:', err.message);
  }

  const candidates = [];

  for (const campaign of campaigns) {
    if (!isActiveCampaign(campaign)) continue;

    const kwHits = phraseHits(lower, campaign.keywords);
    const nicheHits = phraseHits(lower, campaign.niche_keywords);
    const productHits = offeringHits(lower, campaign.offerings);
    const taglineScore = profileTextScore(lower, campaign);
    const customScore = customCategoryScore(lower, campaign);
    const textHits = kwHits + nicheHits + productHits;

    if (textHits === 0 && taglineScore < 0.12 && customScore < 0.12) continue;

    let vectorScore = 0;
    if (promptEmbedding && campaign.embedding?.length > 0) {
      vectorScore = cosineSimilarity(promptEmbedding, campaign.embedding);
    }

    const vectorWeight = vectorScore > 0.25 ? 0.38 : 0.22;
    let relevance =
      Math.min(1, textHits * 0.24) +
      taglineScore * 0.18 +
      customScore * 0.22 +
      vectorScore * vectorWeight;

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
  const { servingContext, recordServe = true, matchPrompt } = options;
  const { candidates, intent, dominantTopic, method: poolMethod } = await findMatchingCandidates(
    prompt,
    campaigns,
    { matchPrompt: matchPrompt || prompt }
  );

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
