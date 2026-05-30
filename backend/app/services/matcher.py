import logging
import time

from app.config import settings
from app.services.categories import detect_prompt_intent, is_other_category
from app.services.embeddings import cosine_similarity, embed_text
from app.services.ranking import RANKING_CONFIG, rank_and_select, record_impression
from app.services import vector_store
from app.utils.timing import log_perf

logger = logging.getLogger(__name__)

MIN_MATCH_SCORE = 0.2


def _is_active_campaign(campaign: dict) -> bool:
    active = campaign.get("active")
    return active not in (0, False)


def _phrase_hits(lower: str, phrases: list[str] | None) -> int:
    n = 0
    for p in phrases or []:
        t = p.lower().strip()
        if len(t) >= 3 and t in lower:
            n += 1
    return n


def _custom_category_score(lower: str, campaign: dict) -> float:
    if not is_other_category(campaign.get("category")) or not campaign.get("custom_category"):
        return 0.0
    label = campaign["custom_category"].lower().strip()
    if len(label) >= 3 and label in lower:
        return 0.5
    words = [w for w in label.split() if len(w) >= 3]
    hits = sum(1 for w in words if w in lower)
    return min(0.45, hits * 0.2)


def _offering_hits(lower: str, offerings: list | None) -> int:
    n = 0.0
    for o in offerings or []:
        name = str(o.get("name") or "").lower().strip()
        if len(name) >= 3 and name in lower:
            n += 1
        n += _phrase_hits(lower, o.get("keywords"))
        desc = str(o.get("description") or "").lower()
        if len(desc) >= 8:
            words = [w for w in desc.split() if len(w) >= 4][:6]
            for w in words:
                if w in lower:
                    n += 0.25
    return int(n)


def _profile_text_score(lower: str, campaign: dict) -> float:
    offering_blob = " ".join(
        " ".join([str(o.get("name") or ""), str(o.get("description") or ""), * (o.get("keywords") or [])])
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

    words = [w for w in blob.split() if len(w) >= 3]
    hits = sum(1 for w in words if w in lower)
    return min(1.0, hits / 4)


async def find_matching_candidates(
    prompt: str,
    campaigns: list[dict],
    *,
    match_prompt: str | None = None,
) -> dict:
    if not campaigns:
        return {"candidates": [], "intent": None, "method": "no-campaigns"}

    match_text = match_prompt or prompt
    lower = match_text.lower()
    intent = detect_prompt_intent(match_text)

    prompt_embedding = None
    vector_scores: dict[str, float] = {}
    try:
        needs_embed = any(_is_active_campaign(c) and c.get("embedding") for c in campaigns)
        if needs_embed and settings.github_token:
            prompt_embedding = await embed_text(match_text)
            if prompt_embedding and vector_store.is_enabled():
                hits = await vector_store.search_similar(prompt_embedding)
                vector_scores = {h["campaign_id"]: h["score"] for h in hits}
    except Exception as err:
        logger.warning("Embedding skipped for matching: %s", err)

    t_scan = time.perf_counter()
    candidates = []
    for campaign in campaigns:
        if not _is_active_campaign(campaign):
            continue

        cid = str(campaign.get("_id"))
        kw_hits = _phrase_hits(lower, campaign.get("keywords"))
        niche_hits = _phrase_hits(lower, campaign.get("niche_keywords"))
        product_hits = _offering_hits(lower, campaign.get("offerings"))
        tagline_score = _profile_text_score(lower, campaign)
        custom_score = _custom_category_score(lower, campaign)
        text_hits = kw_hits + niche_hits + product_hits

        vector_score = vector_scores.get(cid, 0.0)
        if vector_score == 0.0 and prompt_embedding and campaign.get("embedding"):
            vector_score = cosine_similarity(prompt_embedding, campaign["embedding"])

        has_vector_signal = vector_score >= settings.vector_score_threshold
        if text_hits == 0 and tagline_score < 0.12 and custom_score < 0.12 and not has_vector_signal:
            continue

        vector_weight = 0.38 if vector_score > 0.25 else 0.22
        relevance = (
            min(1.0, text_hits * 0.24)
            + tagline_score * 0.18
            + custom_score * 0.22
            + vector_score * vector_weight
        )

        if text_hits > 0:
            relevance = max(relevance, MIN_MATCH_SCORE + 0.08 * text_hits)

        if relevance < MIN_MATCH_SCORE:
            continue

        candidates.append(
            {
                "campaign": campaign,
                "relevance": relevance,
                "score": relevance,
                "keywordMatches": kw_hits,
                "nicheMatches": niche_hits,
                "taglineScore": tagline_score,
                "vectorScore": vector_score,
                "intent": intent,
                "method": "simple-keyword",
            }
        )

    scan_ms = (time.perf_counter() - t_scan) * 1000
    log_perf(
        "match.scan",
        scan_ms,
        campaigns=len(campaigns),
        candidates=len(candidates),
        embedded=bool(prompt_embedding),
        vectordb=len(vector_scores),
    )

    method = "hybrid-vectordb" if vector_scores else "simple-keyword"
    if not candidates:
        method = "no-match"
    elif vector_scores and candidates:
        method = "hybrid-vectordb+keyword"

    dominant = f"{intent['category']}/{intent['subcategory']}" if intent.get("subcategory") else intent.get("category")
    return {
        "candidates": candidates,
        "intent": intent,
        "dominantTopic": dominant,
        "method": method,
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
        return {"campaign": None, "score": -1, "method": pool_method, "dominantTopic": dominant_topic, "intent": intent}

    t_rank = time.perf_counter()
    ranked = rank_and_select(candidates, serving_context)
    log_perf("match.rank", (time.perf_counter() - t_rank) * 1000, pool=len(candidates))
    selected = ranked["selected"]
    rank_method = ranked["method"]

    if not selected:
        return {"campaign": None, "score": -1, "method": rank_method or pool_method, "dominantTopic": dominant_topic, "intent": intent}

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
        "candidateCount": len(candidates),
        "rankedPoolSize": len(ranked.get("candidates") or []),
    }


__all__ = ["find_best_campaign", "find_matching_candidates", "RANKING_CONFIG"]
