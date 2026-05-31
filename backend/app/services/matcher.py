"""
Synaptic AI — Campaign Matching Engine v2

Hybrid multi-signal matcher that combines:
  1. Keyword / phrase matching (exact + fuzzy)
  2. Offering-level deep matching
  3. Profile text semantic scanning
  4. Vector embedding similarity (Qdrant ANN + fallback cosine)
  5. Intent-aware category boosting
  6. Custom category affinity scoring

Scoring formula:
  relevance = Σ(signal_weight × signal_score) × intent_boost × freshness_factor
"""

import logging
import math
import time
from datetime import datetime, timezone

from app.config import settings
from app.services.categories import detect_prompt_intent, is_other_category, TAXONOMY
from app.services.embeddings import cosine_similarity, embed_text
from app.services.ranking import RANKING_CONFIG, rank_and_select, record_impression
from app.services import vector_store
from app.utils.timing import log_perf

logger = logging.getLogger(__name__)

# ── Scoring thresholds ──────────────────────────────────────────────────────
MIN_MATCH_SCORE = 0.18
HIGH_CONFIDENCE_SCORE = 0.65
VECTOR_DOMINANCE_THRESHOLD = 0.35

# ── Signal weights (sum ≈ 1.0 for normalized output) ────────────────────────
W_KEYWORD = 0.22
W_NICHE = 0.10
W_OFFERING = 0.14
W_TAGLINE = 0.10
W_CUSTOM_CAT = 0.08
W_VECTOR = 0.28
W_INTENT = 0.08


def _is_active_campaign(campaign: dict) -> bool:
    active = campaign.get("active")
    return active not in (0, False)


# ── Phrase / keyword matching ────────────────────────────────────────────────

def _phrase_hits(lower: str, phrases: list[str] | None) -> tuple[int, list[str]]:
    """Count phrase hits and return matched phrases for debugging."""
    n = 0
    matched = []
    for p in phrases or []:
        t = p.lower().strip()
        if len(t) >= 2 and t in lower:
            n += 1
            matched.append(t)
    return n, matched


def _fuzzy_token_overlap(lower: str, phrase: str) -> float:
    """Token-level fuzzy overlap score for partial matches."""
    tokens = [t for t in phrase.lower().split() if len(t) >= 3]
    if not tokens:
        return 0.0
    hits = sum(1 for t in tokens if t in lower)
    return hits / len(tokens) if tokens else 0.0


# ── Offering-level deep matching ────────────────────────────────────────────

def _offering_score(lower: str, offerings: list | None) -> tuple[float, int]:
    """
    Deep match against campaign offerings.
    Returns (score, hit_count) where score accounts for name, description,
    keywords, and price signals.
    """
    if not offerings:
        return 0.0, 0

    total_score = 0.0
    hit_count = 0

    for o in offerings or []:
        o_score = 0.0

        # Offering name match (strongest signal)
        name = str(o.get("name") or "").lower().strip()
        if len(name) >= 2 and name in lower:
            o_score += 1.0
            hit_count += 1
        elif len(name) >= 3:
            overlap = _fuzzy_token_overlap(lower, name)
            if overlap >= 0.5:
                o_score += overlap * 0.6
                hit_count += 1

        # Offering keywords
        kw_hits, _ = _phrase_hits(lower, o.get("keywords"))
        if kw_hits > 0:
            o_score += min(0.6, kw_hits * 0.2)
            hit_count += kw_hits

        # Offering description context
        desc = str(o.get("description") or "").lower()
        if len(desc) >= 8:
            words = [w for w in desc.split() if len(w) >= 4][:8]
            desc_hits = sum(1 for w in words if w in lower)
            if desc_hits > 0:
                o_score += min(0.3, desc_hits * 0.08)

        total_score += o_score

    # Normalize to [0, 1]
    max_possible = len(offerings) * 1.9
    return min(1.0, total_score / max_possible) if max_possible > 0 else 0.0, hit_count


# ── Custom category matching ────────────────────────────────────────────────

def _custom_category_score(lower: str, campaign: dict) -> float:
    if not is_other_category(campaign.get("category")) or not campaign.get("custom_category"):
        return 0.0

    label = campaign["custom_category"].lower().strip()

    # Exact match
    if len(label) >= 3 and label in lower:
        return 1.0

    # Token overlap
    overlap = _fuzzy_token_overlap(lower, label)
    return min(0.8, overlap)


# ── Profile text semantic scanning ──────────────────────────────────────────

def _profile_text_score(lower: str, campaign: dict) -> float:
    """Scan campaign's full textual profile for relevance signals."""
    offering_blob = " ".join(
        " ".join([str(o.get("name") or ""), str(o.get("description") or ""), *(o.get("keywords") or [])])
        for o in (campaign.get("offerings") or [])
    )
    blob = " ".join(
        filter(
            None,
            [
                campaign.get("tagline"),
                campaign.get("description"),
                campaign.get("name"),
                offering_blob,
            ],
        )
    ).lower()
    if not blob.strip():
        return 0.0

    words = set(w for w in blob.split() if len(w) >= 3)
    prompt_words = set(w for w in lower.split() if len(w) >= 3)
    if not words or not prompt_words:
        return 0.0

    overlap = words & prompt_words
    # Jaccard-like score weighted toward campaign coverage
    score = len(overlap) / min(len(words), len(prompt_words) + 1)
    return min(1.0, score * 1.5)


# ── Intent-aware boosting ───────────────────────────────────────────────────

def _intent_boost(intent: dict | None, campaign: dict) -> float:
    """
    Boost campaigns whose category matches the detected intent.
    Returns a multiplier in [1.0, 1.4].
    """
    if not intent or not intent.get("category"):
        return 1.0

    campaign_cat = campaign.get("category", "")
    intent_cat = intent.get("category", "")
    intent_sub = intent.get("subcategory", "")

    # Exact category + subcategory match
    if campaign_cat == intent_cat and campaign.get("subcategory") == intent_sub:
        return 1.4

    # Category match only
    if campaign_cat == intent_cat:
        return 1.25

    # Custom category with intent signals
    if is_other_category(campaign_cat) and intent.get("matched"):
        custom = (campaign.get("custom_category") or "").lower()
        if any(m in custom for m in intent["matched"]):
            return 1.2

    return 1.0


# ── Freshness factor ────────────────────────────────────────────────────────

def _freshness_factor(campaign: dict) -> float:
    """
    Slight boost for recently updated campaigns.
    Returns multiplier in [0.95, 1.05].
    """
    updated = campaign.get("updatedAt")
    if not updated or not isinstance(updated, datetime):
        return 1.0

    age_hours = (datetime.now(timezone.utc) - updated).total_seconds() / 3600
    if age_hours < 24:
        return 1.05
    elif age_hours < 168:  # 1 week
        return 1.02
    elif age_hours > 720:  # 30 days
        return 0.97
    return 1.0


# ── Main matching pipeline ──────────────────────────────────────────────────

async def find_matching_candidates(
    prompt: str,
    campaigns: list[dict],
    *,
    match_prompt: str | None = None,
) -> dict:
    if not campaigns:
        return {"candidates": [], "intent": None, "method": "no-campaigns", "debug": {}}

    match_text = match_prompt or prompt
    lower = match_text.lower()
    intent = detect_prompt_intent(match_text)

    # ── Vector embedding phase ──────────────────────────────────────────
    prompt_embedding = None
    vector_scores: dict[str, float] = {}
    embedding_latency_ms = 0

    try:
        needs_embed = any(_is_active_campaign(c) and c.get("embedding") for c in campaigns)
        if needs_embed and settings.github_token:
            t_emb = time.perf_counter()
            prompt_embedding = await embed_text(match_text)
            embedding_latency_ms = round((time.perf_counter() - t_emb) * 1000, 1)

            if prompt_embedding and vector_store.is_enabled():
                hits = await vector_store.search_similar(prompt_embedding)
                vector_scores = {h["campaign_id"]: h["score"] for h in hits}
    except Exception as err:
        logger.warning("Embedding skipped for matching: %s", err)

    # ── Candidate scoring phase ─────────────────────────────────────────
    t_scan = time.perf_counter()
    candidates = []
    debug_skipped = 0

    for campaign in campaigns:
        if not _is_active_campaign(campaign):
            continue

        cid = str(campaign.get("_id"))

        # Signal extraction
        kw_hits, kw_matched = _phrase_hits(lower, campaign.get("keywords"))
        niche_hits, niche_matched = _phrase_hits(lower, campaign.get("niche_keywords"))
        offering_sc, offering_hits = _offering_score(lower, campaign.get("offerings"))
        tagline_sc = _profile_text_score(lower, campaign)
        custom_sc = _custom_category_score(lower, campaign)

        # Vector similarity
        vector_score = vector_scores.get(cid, 0.0)
        if vector_score == 0.0 and prompt_embedding and campaign.get("embedding"):
            vector_score = cosine_similarity(prompt_embedding, campaign["embedding"])

        # ── Weighted relevance score (Dynamic based on prompt detail) ────────────────
        kw_norm = min(1.0, kw_hits * 0.3)
        niche_norm = min(1.0, niche_hits * 0.35)

        # If prompt is short/vague, trust vector more. If detailed, trust hits more.
        prompt_len = len(lower.split())
        if prompt_len <= 3:
            v_dynamic = W_VECTOR + 0.12
            k_dynamic = max(0.05, W_KEYWORD - 0.1)
        elif prompt_len >= 12:
            v_dynamic = max(0.1, W_VECTOR - 0.06)
            k_dynamic = W_KEYWORD + 0.06
        else:
            v_dynamic = W_VECTOR
            k_dynamic = W_KEYWORD

        raw_relevance = (
            k_dynamic * kw_norm
            + W_NICHE * niche_norm
            + W_OFFERING * offering_sc
            + W_TAGLINE * tagline_sc
            + W_CUSTOM_CAT * custom_sc
            + v_dynamic * min(1.0, vector_score)
        )

        # Intent boost as multiplier
        boost = _intent_boost(intent, campaign)
        freshness = _freshness_factor(campaign)

        relevance = raw_relevance * boost * freshness

        # ── Gate: minimum threshold ─────────────────────────────────────
        has_any_text = kw_hits > 0 or niche_hits > 0 or offering_hits > 0
        has_tagline_signal = tagline_sc >= 0.1
        has_custom_signal = custom_sc >= 0.1
        has_vector_signal = vector_score >= settings.vector_score_threshold

        if not has_any_text and not has_tagline_signal and not has_custom_signal and not has_vector_signal:
            debug_skipped += 1
            continue

        # Ensure minimum for text matches
        if has_any_text:
            text_floor = MIN_MATCH_SCORE + 0.06 * (kw_hits + niche_hits + offering_hits)
            relevance = max(relevance, text_floor)

        # Strong vector match floor
        if vector_score >= VECTOR_DOMINANCE_THRESHOLD:
            relevance = max(relevance, vector_score * 0.85)

        if relevance < MIN_MATCH_SCORE:
            debug_skipped += 1
            continue

        candidates.append(
            {
                "campaign": campaign,
                "relevance": round(relevance, 4),
                "score": round(relevance, 4),
                "keywordMatches": kw_hits,
                "nicheMatches": niche_hits,
                "offeringScore": round(offering_sc, 3),
                "taglineScore": round(tagline_sc, 3),
                "customCategoryScore": round(custom_sc, 3),
                "vectorScore": round(vector_score, 4),
                "intentBoost": round(boost, 2),
                "freshness": round(freshness, 3),
                "matchedKeywords": kw_matched[:5],
                "matchedNiche": niche_matched[:3],
                "intent": intent,
                "method": "hybrid-v2",
            }
        )

    scan_ms = (time.perf_counter() - t_scan) * 1000

    # Sort by relevance descending for better ranking input
    candidates.sort(key=lambda c: c["relevance"], reverse=True)

    # Determine method
    method = "no-match"
    if candidates:
        has_vector = any(c["vectorScore"] > 0 for c in candidates)
        has_text = any(c["keywordMatches"] > 0 or c["nicheMatches"] > 0 for c in candidates)
        if has_vector and has_text:
            method = "hybrid-v2"
        elif has_vector:
            method = "vector-only"
        elif has_text:
            method = "keyword-only"
        else:
            method = "profile-match"

    log_perf(
        "match.scan",
        scan_ms,
        campaigns=len(campaigns),
        candidates=len(candidates),
        skipped=debug_skipped,
        embedded=bool(prompt_embedding),
        vectordb=len(vector_scores),
        embed_ms=embedding_latency_ms,
    )

    dominant = (
        f"{intent['category']}/{intent['subcategory']}"
        if intent.get("subcategory")
        else intent.get("category")
    )

    return {
        "candidates": candidates,
        "intent": intent,
        "dominantTopic": dominant,
        "method": method,
        "debug": {
            "total_campaigns": len(campaigns),
            "active_scanned": len(campaigns) - debug_skipped - len(candidates) + len(candidates),
            "candidates_found": len(candidates),
            "skipped": debug_skipped,
            "embedding_used": bool(prompt_embedding),
            "embedding_latency_ms": embedding_latency_ms,
            "vectordb_hits": len(vector_scores),
            "scan_ms": round(scan_ms, 2),
            "top_score": round(candidates[0]["relevance"], 4) if candidates else 0,
        },
    }


async def find_best_campaign(
    prompt: str,
    campaigns: list[dict],
    *,
    serving_context: dict | None = None,
    record_serve: bool = True,
    match_prompt: str | None = None,
) -> dict:
    pool = await find_matching_candidates(prompt, campaigns, match_prompt=match_prompt or prompt)
    candidates = pool["candidates"]
    intent = pool["intent"]
    dominant_topic = pool["dominantTopic"]
    pool_method = pool["method"]

    if not candidates:
        return {
            "campaign": None,
            "score": -1,
            "method": pool_method,
            "dominantTopic": dominant_topic,
            "intent": intent,
        }

    t_rank = time.perf_counter()
    ranked = rank_and_select(candidates, serving_context)
    rank_ms = (time.perf_counter() - t_rank) * 1000
    log_perf("match.rank", rank_ms, pool=len(candidates))
    selected = ranked["selected"]
    rank_method = ranked["method"]

    if not selected:
        return {
            "campaign": None,
            "score": -1,
            "method": rank_method or pool_method,
            "dominantTopic": dominant_topic,
            "intent": intent,
        }

    if record_serve:
        record_impression(serving_context, selected["campaign"])

    return {
        "campaign": selected["campaign"],
        "score": selected["relevance"],
        "hybridScore": selected.get("hybridScore"),
        "method": f"{pool_method}+{rank_method}",
        "dominantTopic": dominant_topic,
        "intent": intent,
        "keywordMatches": selected.get("keywordMatches"),
        "nicheMatches": selected.get("nicheMatches"),
        "offeringScore": selected.get("offeringScore"),
        "vectorScore": selected.get("vectorScore"),
        "intentBoost": selected.get("intentBoost"),
        "candidateCount": len(candidates),
        "rankedPoolSize": len(ranked.get("candidates") or []),
    }


__all__ = ["find_best_campaign", "find_matching_candidates", "RANKING_CONFIG"]
