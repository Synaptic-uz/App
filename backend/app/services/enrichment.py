import json
import logging
import re
import time
from functools import lru_cache

from nanoid import generate as nanoid
from openai import AsyncOpenAI

from app.config import settings
from app.core.bson_utils import oid
from app.db.mongo import get_db
from app.services.campaign_cache import load_campaign_cache
from app.services.campaign_cache import increment_campaign_impression
from app.services.conversation import MARKDOWN_SYSTEM_HINT, build_matching_prompt, history_cache_key, normalize_chat_history
from app.services.matcher import find_best_campaign

logger = logging.getLogger(__name__)

MODEL = "openai/gpt-4o-mini"
HOT_KEYWORDS = [
    "sotib", "olmoq", "narxi", "qancha turadi", "qayerda bor", "eng arzon", "hozir", "bugun",
    "muddatli tolov", "bo'lib to'lash", "chegirma", "aksiya", "buyurtma", "yetkazib", "delivery",
    "buy now", "cheapest", "where to buy", "price", "deal", "discount", "installment",
]
WARM_KEYWORDS = [
    "qaysi biri yaxshi", "taqqosla", "farqi", "review", "tavsiya", "yaxshi", "yomon",
    "compare", "which is better", "vs", "versus", "quality", "warranty",
]

_response_cache: dict = {}
RESPONSE_TTL = 300_000
MAX_CACHE = 500


@lru_cache
def _client() -> AsyncOpenAI | None:
    if not settings.github_token:
        return None
    return AsyncOpenAI(base_url="https://models.github.ai/inference", api_key=settings.github_token)


def _rule_intent(prompt: str) -> dict | None:
    lower = prompt.lower()
    hot = sum(0.3 for kw in HOT_KEYWORDS if kw in lower)
    warm = sum(0.3 for kw in WARM_KEYWORDS if kw in lower)
    if hot >= 0.6:
        return {"intent": "hot", "confidence": min(hot, 1.0), "method": "rule"}
    if warm >= 0.6:
        return {"intent": "warm", "confidence": min(warm, 1.0), "method": "rule"}
    if hot >= 0.3:
        return {"intent": "warm", "confidence": hot, "method": "rule"}
    return None


def _get_cached(prompt, history, answer_only):
    key = history_cache_key(prompt, history, answer_only)
    cached = _response_cache.get(key)
    if cached and time.time() * 1000 - cached["ts"] < RESPONSE_TTL:
        return cached["data"]
    if cached:
        _response_cache.pop(key, None)
    return None


def _set_cached(prompt, history, data, answer_only):
    if len(_response_cache) >= MAX_CACHE:
        _response_cache.pop(next(iter(_response_cache)))
    _response_cache[history_cache_key(prompt, history, answer_only)] = {"data": data, "ts": time.time() * 1000}


def _build_llm_messages(system_prompt, history, latest, use_markdown):
    system = f"{system_prompt}\n\n{MARKDOWN_SYSTEM_HINT}" if use_markdown else system_prompt
    msgs = [{"role": "system", "content": system}]
    turns = normalize_chat_history(history)
    prompt = str(latest or "").strip()
    last_is_current = turns and turns[-1]["role"] == "user" and turns[-1]["content"] == prompt
    prior = turns[:-1] if last_is_current else turns
    msgs.extend({"role": t["role"], "content": t["content"]} for t in prior)
    msgs.append({"role": "user", "content": prompt})
    return msgs


async def _chat(system_prompt, history, latest, use_markdown=True, temperature=0.4):
    client = _client()
    if not client:
        raise RuntimeError("GITHUB_TOKEN not set")
    resp = await client.chat.completions.create(
        model=MODEL,
        messages=_build_llm_messages(system_prompt, history, latest, use_markdown),
        temperature=temperature,
    )
    return {"text": resp.choices[0].message.content or "", "usage": resp.usage.model_dump() if resp.usage else {}}


async def _classify_intent(prompt: str) -> dict:
    client = _client()
    resp = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": 'Classify intent: COLD (exploring), WARM (comparing), HOT (buying now).\nJSON: {"intent":"cold|warm|hot","confidence":0.0-1.0,"signals":["s1"],"urgency":"low|medium|high","price_sensitivity":"low|medium|high"}',
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.1,
        max_tokens=150,
    )
    content = resp.choices[0].message.content or ""
    try:
        m = re.search(r"\{[\s\S]*\}", content)
        result = json.loads(m.group(0)) if m else {"intent": "cold", "confidence": 0.5, "signals": ["parse_failed"]}
    except json.JSONDecodeError:
        result = {"intent": "cold", "confidence": 0.5, "signals": ["parse_failed"]}
    result["usage"] = resp.usage.model_dump() if resp.usage else {}
    result["method"] = "llm"
    result.setdefault("urgency", "low")
    result.setdefault("price_sensitivity", "medium")
    return result


async def _log_analytics(session_id, campaign, intent, score):
    db = get_db()
    ops = []
    if campaign:
        await db.events.insert_one(
            {
                "campaign_id": oid(campaign["_id"]),
                "type": "impression",
                "session_id": session_id,
                "intent_type": intent.get("intent"),
                "createdAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc),
            }
        )
        await increment_campaign_impression(str(campaign["_id"]), campaign.get("cpc_rate") or 0)
    await db.sessions.insert_one(
        {
            "session_id": session_id,
            "user_prompt": session_id[:200],
            "intent_type": intent.get("intent", "cold"),
            "intent_confidence": intent.get("confidence", 0),
            "matched_campaign_id": oid(campaign["_id"]) if campaign else None,
            "similarity_score": score if campaign else 0,
            "enriched": bool(campaign),
            "createdAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        }
    )


async def enrich_response(prompt: str, session_id: str | None = None, *, answer_only=False, messages=None, parse_mode="Markdown"):
    start = time.time() * 1000
    session = session_id or nanoid(size=16)
    history = normalize_chat_history(messages or [])
    match_prompt = build_matching_prompt(prompt, history)
    use_md = parse_mode.lower() == "markdown"

    cached = _get_cached(prompt, history, answer_only)
    if cached and len(history) <= 2:
        return {**cached, "session_id": session, "_cached": True}

    rule = _rule_intent(match_prompt)
    if rule:
        intent = {
            **rule,
            "signals": ["purchase_keywords", "urgency_detected"] if rule["intent"] == "hot" else ["comparison_keywords"],
            "urgency": "high" if rule["intent"] == "hot" else "medium",
            "price_sensitivity": "medium",
            "usage": {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0},
        }
    else:
        try:
            intent = await _classify_intent(match_prompt)
        except Exception as err:
            logger.warning("Intent classification failed: %s", err)
            intent = {"intent": "cold", "confidence": 0.5, "signals": ["llm_failed"], "urgency": "low", "price_sensitivity": "medium", "usage": {}, "method": "fallback"}

    applied = None
    score = -1.0
    match_method = "none"
    gen_usage = None
    final_text = ""

    if answer_only:
        try:
            r = await _chat(
                f"Synaptic AI assistant. Intent: {intent['intent'].upper()}.\nAnswer directly. No ads/brands/URLs.",
                history,
                prompt,
                use_md,
            )
            final_text = r["text"]
            gen_usage = r["usage"]
        except Exception:
            final_text = "Savolingiz bo'yicha yordam bera olaman."
    else:
        campaigns = await load_campaign_cache()
        try:
            match = await find_best_campaign(
                prompt,
                campaigns,
                serving_context={"sessionId": session},
                match_prompt=match_prompt,
            )
            applied = match.get("campaign")
            score = match.get("score", -1)
            match_method = match.get("method") or "none"
        except Exception as err:
            logger.warning("Campaign matching failed: %s", err)

        if applied:
            brand = applied.get("link_text") or applied.get("name")
            templates = {
                "hot": f"Synaptic AI. HOT intent. Mention brand by name only: {brand}. BRAND: {applied.get('name')} | {applied.get('description')}",
                "warm": f"Synaptic AI. WARM intent. Comparative tone. Brand: {brand}.",
                "cold": f"Synaptic AI. COLD intent. Topic: {applied.get('category')}. Brand if relevant: {brand}.",
            }
            sys_p = templates.get(intent.get("intent"), templates["cold"])
            try:
                r = await _chat(sys_p, history, prompt, use_md, 0.35 if intent.get("intent") == "hot" else 0.45)
                final_text = r["text"]
                gen_usage = r["usage"]
            except Exception:
                final_text = f"I found something relevant: {applied.get('name')} might help."
        else:
            try:
                r = await _chat(
                    f"Synaptic AI. Intent: {intent.get('intent', 'cold').upper()}. Answer fully. No ads.",
                    history,
                    prompt,
                    use_md,
                )
                final_text = r["text"]
                gen_usage = r["usage"]
            except Exception:
                final_text = "I'm here to help. Could you rephrase your question?"

    try:
        await _log_analytics(session, applied, intent, score)
    except Exception:
        pass

    result = {
        "text": final_text,
        "session_id": session,
        "enriched": bool(applied),
        "campaignId": applied["_id"] if applied else None,
        "campaign_name": applied.get("name") if applied else None,
        "category": applied.get("category") if applied else "N/A",
        "similarity_score": f"{score:.3f}" if applied and score > -1 else None,
        "matched_via": match_method if applied else None,
        "intent": {"type": intent.get("intent"), "confidence": intent.get("confidence"), "signals": intent.get("signals", [])},
        "usage": {
            "intent_classification": intent.get("usage"),
            "generation": gen_usage,
            "total_tokens": (intent.get("usage") or {}).get("total_tokens", 0) + (gen_usage or {}).get("total_tokens", 0),
        },
        "performance": {
            "total_ms": int(time.time() * 1000 - start),
            "intent_method": intent.get("method", "llm"),
            "match_method": match_method,
        },
    }

    if (answer_only or not applied or intent.get("intent") == "cold") and len(history) <= 2:
        _set_cached(prompt, history, result, answer_only)

    return result
