import asyncio
from datetime import datetime, timezone

from app.core.bson_utils import oid
from app.db.mongo import get_db
from app.services.ranking import bulk_load_ctr, sync_campaign_stats
from app.services.wallet import has_campaign_budget_remaining, pause_campaign_if_budget_exhausted


async def increment_campaign_impression(campaign_id: str, cpc_rate: float = 0) -> None:
    db = get_db()
    cid = oid(campaign_id)
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    campaign = await db.campaigns.find_one({"_id": cid}, {"last_reset_date": 1, "today_impressions": 1})
    if not campaign:
        return
    last = campaign.get("last_reset_date")
    same_day = last and last.date() == today.date()
    if same_day:
        await db.campaigns.update_one({"_id": cid}, {"$inc": {"today_impressions": 1, "stats_impressions": 1}})
    else:
        await db.campaigns.update_one(
            {"_id": cid},
            {"$set": {"today_impressions": 1, "last_reset_date": today}, "$inc": {"stats_impressions": 1}},
        )


async def increment_campaign_click(campaign_id: str, cpc_rate: float = 0) -> None:
    db = get_db()
    cid = oid(campaign_id)
    cpc = max(0, float(cpc_rate or 0))
    await db.campaigns.update_one({"_id": cid}, {"$inc": {"stats_clicks": 1, "spent": cpc}})
    await pause_campaign_if_budget_exhausted(str(campaign_id))


async def credit_agent_revenue(username: str, amount: float) -> None:
    if not username or amount <= 0:
        return
    db = get_db()
    await db.agents.update_one(
        {"username": username},
        {"$inc": {"total_clicks": 1, "revenue_earned": amount}},
    )


async def bootstrap_ranking_stats() -> None:
    db = get_db()
    cursor = db.campaigns.find({}, {"stats_impressions": 1, "stats_clicks": 1})
    rows = []
    async for c in cursor:
        rows.append({"_id": c["_id"], "impressions": c.get("stats_impressions") or 0, "clicks": c.get("stats_clicks") or 0})
    bulk_load_ctr(rows)


_campaign_cache: list[dict] = []
_cache_ts: float = 0
CACHE_TTL = 60_000


async def load_campaign_cache(force: bool = False) -> list[dict]:
    global _campaign_cache, _cache_ts
    import time

    now = time.time() * 1000
    if not force and _campaign_cache and now - _cache_ts < CACHE_TTL:
        return _campaign_cache

    db = get_db()
    cursor = db.campaigns.find({"active": {"$in": [1, True]}})
    campaigns = []
    async for c in cursor:
        if not has_campaign_budget_remaining(c):
            continue
        campaigns.append(
            {
                "_id": str(c["_id"]),
                "name": c.get("name"),
                "category": c.get("category"),
                "brand_url": c.get("brand_url"),
                "link_text": c.get("link_text"),
                "tracking_code": c.get("tracking_code"),
                "description": c.get("description"),
                "keywords": c.get("keywords") or [],
                "cpc_rate": c.get("cpc_rate") or 0,
                "cpa_percentage": c.get("cpa_percentage") or 0,
                "tone": c.get("tone") or "informative",
                "subcategory": c.get("subcategory") or "general",
                "custom_category": c.get("custom_category") or "",
                "niche_keywords": c.get("niche_keywords") or [],
                "owner_id": str(c["owner_id"]) if c.get("owner_id") else None,
                "max_daily_impressions": c.get("max_daily_impressions"),
                "today_impressions": c.get("today_impressions"),
                "last_reset_date": c.get("last_reset_date"),
                "stats_impressions": c.get("stats_impressions"),
                "stats_clicks": c.get("stats_clicks"),
                "budget": c.get("budget") or 0,
                "spent": c.get("spent") or 0,
                "embedding": c.get("embedding"),
                "offerings": c.get("offerings") or [],
                "tagline": c.get("tagline"),
                "active": c.get("active"),
            }
        )
    sync_campaign_stats(campaigns)
    _campaign_cache = campaigns
    _cache_ts = now
    return campaigns


def invalidate_campaign_cache() -> None:
    global _cache_ts
    _cache_ts = 0


async def reload_campaign_cache_bg() -> None:
    await load_campaign_cache(force=True)
