import time
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.config import settings
from app.core.bson_utils import oid, serialize_doc
from app.core.deps import AuthUser, get_current_user
from app.db.mongo import get_db
from app.services.campaign_cache import credit_agent_revenue, increment_campaign_click, increment_campaign_impression
from app.services.ranking import record_click

router = APIRouter(tags=["analytics"])

METRICS_DAYS = 7
_analytics_cache: dict = {"data": None, "ts": 0}


def _period_start(days: int = METRICS_DAYS) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


async def _aggregate_campaign_events(campaign_id, since: datetime | None = None) -> dict:
    match: dict = {"campaign_id": oid(campaign_id)}
    if since:
        match["createdAt"] = {"$gte": since}
    pipeline = [{"$match": match}, {"$group": {"_id": "$type", "count": {"$sum": 1}}}]
    rows = await get_db().events.aggregate(pipeline).to_list(10)
    imp = clk = conv = 0
    for e in rows:
        if e["_id"] == "impression":
            imp = e["count"]
        elif e["_id"] == "click":
            clk = e["count"]
        elif e["_id"] == "conversion":
            conv = e["count"]
    ctr = f"{(clk / imp * 100):.2f}%" if imp else "0%"
    cr = f"{(conv / clk * 100):.2f}%" if clk else "0%"
    return {"impressions": imp, "clicks": clk, "conversions": conv, "ctr": ctr, "conversion_rate": cr}


def _format_daily(daily_stats: list) -> list:
    formatted = {}
    for d in daily_stats:
        date = d["_id"]["date"]
        if date not in formatted:
            formatted[date] = {"date": date, "impressions": 0, "clicks": 0, "conversions": 0}
        t = d["_id"]["type"]
        if t == "impression":
            formatted[date]["impressions"] += d["count"]
        elif t == "click":
            formatted[date]["clicks"] += d["count"]
        elif t == "conversion":
            formatted[date]["conversions"] += d["count"]
    return list(formatted.values())


@router.get("/api/analytics")
async def analytics():
    global _analytics_cache
    if _analytics_cache["data"] and time.time() * 1000 - _analytics_cache["ts"] < 10_000:
        return _analytics_cache["data"]

    db = get_db()
    campaigns = await db.campaigns.find({}).to_list(500)
    ids = [c["_id"] for c in campaigns]
    stats = await db.events.aggregate(
        [
            {"$match": {"campaign_id": {"$in": ids}}},
            {"$group": {"_id": {"campaign_id": "$campaign_id", "type": "$type"}, "count": {"$sum": 1}}},
        ]
    ).to_list(5000)

    cmap = {
        str(c["_id"]): {
            "id": str(c["_id"]),
            "name": c["name"],
            "category": c.get("category"),
            "impressions": 0,
            "clicks": 0,
            "conversions": 0,
            "cpc_rate": c.get("cpc_rate"),
            "cpa_percentage": c.get("cpa_percentage"),
            "budget": c.get("budget"),
            "spent": c.get("spent"),
        }
        for c in campaigns
    }
    ti = tc = tconv = 0
    for s in stats:
        cid = str(s["_id"]["campaign_id"])
        if cid not in cmap:
            continue
        t = s["_id"]["type"]
        if t == "impression":
            cmap[cid]["impressions"] += s["count"]
            ti += s["count"]
        elif t == "click":
            cmap[cid]["clicks"] += s["count"]
            tc += s["count"]
        elif t == "conversion":
            cmap[cid]["conversions"] += s["count"]
            tconv += s["count"]

    ctr = (tc / ti * 100) if ti else 0
    cr = (tconv / tc * 100) if tc else 0
    result = {
        "campaigns": list(cmap.values()),
        "overview": {
            "totalImpressions": ti,
            "totalClicks": tc,
            "totalConversions": tconv,
            "ctr": f"{ctr:.2f}%",
            "conversion_rate": f"{cr:.2f}%",
        },
    }
    _analytics_cache = {"data": result, "ts": time.time() * 1000}
    return result


@router.get("/api/intent-stats")
async def intent_stats():
    db = get_db()
    dist = await db.sessions.aggregate([{"$group": {"_id": "$intent_type", "count": {"$sum": 1}}}]).to_list(20)
    hourly = await db.sessions.aggregate(
        [
            {"$group": {"_id": {"$hour": "$createdAt"}, "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}},
        ]
    ).to_list(30)
    top = await db.sessions.aggregate(
        [
            {"$match": {"matched_campaign_id": {"$ne": None}}},
            {"$group": {"_id": "$matched_campaign_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]
    ).to_list(10)
    return {
        "intent_distribution": dist,
        "hourly_pattern": hourly,
        "top_categories": top,
    }


@router.get("/api/dashboard/{campaign_id}")
async def campaign_dashboard(campaign_id: str, user: Annotated[AuthUser, Depends(get_current_user)]):
    db = get_db()
    campaign = await db.campaigns.find_one({"_id": oid(campaign_id), "owner_id": oid(user.id)})
    if not campaign:
        raise HTTPException(404, "Kampaniya topilmadi")

    since = _period_start()
    totals7d = await _aggregate_campaign_events(campaign_id, since)
    totals_all = await _aggregate_campaign_events(campaign_id)
    clicks7d = totals7d["clicks"]
    cpc = max(0, float(campaign.get("cpc_rate") or 0))
    spend7d = {"cpc_rate": cpc, "spent_period": clicks7d * cpc, "avg_cpc": cpc if clicks7d == 0 else round(clicks7d * cpc / clicks7d)}

    daily = await db.events.aggregate(
        [
            {"$match": {"campaign_id": oid(campaign_id), "createdAt": {"$gte": since}}},
            {
                "$group": {
                    "_id": {"date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}}, "type": "$type"},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id.date": 1}},
        ]
    ).to_list(500)

    budget = float(campaign.get("budget") or 0)
    spent = float(campaign.get("spent") or 0)
    return {
        "period_days": METRICS_DAYS,
        "campaign": {
            "id": str(campaign["_id"]),
            "name": campaign["name"],
            "category": campaign.get("category"),
            "brand_url": campaign.get("brand_url"),
            "tracking_code": campaign.get("tracking_code"),
            "tracking_path": f"/t/{campaign.get('tracking_code')}",
            "cpc_rate": campaign.get("cpc_rate"),
            "cpa_percentage": campaign.get("cpa_percentage"),
            "budget": budget,
            "spent": spent,
            "budget_remaining": max(0, budget - spent) if budget else None,
            "source": campaign.get("source"),
        },
        "totals": {**totals7d, **spend7d},
        "totals_all_time": totals_all,
        "daily_stats": _format_daily(daily),
    }


@router.get("/api/agents/{username}/stats")
async def agent_stats(username: str, user: Annotated[AuthUser, Depends(get_current_user)]):
    db = get_db()
    agent = await db.agents.find_one({"username": username})
    if not agent:
        raise HTTPException(404, "Agent topilmadi")
    if agent.get("owner_id") and str(agent["owner_id"]) != user.id:
        raise HTTPException(403, "Ushbu agentga kirish huquqi yo‘q")

    since = _period_start()
    match7 = {"agent_id": username, "createdAt": {"$gte": since}}
    match_all = {"agent_id": username}

    async def agg(match):
        rows = await db.events.aggregate([{"$match": match}, {"$group": {"_id": "$type", "count": {"$sum": 1}}}]).to_list(10)
        imp = clk = 0
        for e in rows:
            if e["_id"] == "impression":
                imp = e["count"]
            elif e["_id"] == "click":
                clk = e["count"]
        ctr = f"{(clk / imp * 100):.2f}%" if imp else "0%"
        return {"impressions": imp, "clicks": clk, "ctr": ctr}

    totals7d = await agg(match7)
    totals_all = await agg(match_all)
    daily = await db.events.aggregate(
        [
            {"$match": match7},
            {
                "$group": {
                    "_id": {"date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}}, "type": "$type"},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id.date": 1}},
        ]
    ).to_list(500)

    agent.pop("api_key_hash", None)
    return {
        "agent": serialize_doc(agent),
        "period_days": METRICS_DAYS,
        "totals": {**totals7d, "revenue_earned": agent.get("revenue_earned") or 0},
        "totals_all_time": totals_all,
        "daily_stats": _format_daily(daily),
    }


@router.get("/api/sessions")
async def chat_sessions(limit: int = Query(50), intent_type: str | None = None):
    filt = {}
    if intent_type:
        filt["intent_type"] = intent_type
    cursor = get_db().sessions.find(filt).sort("createdAt", -1).limit(limit)
    rows = []
    async for doc in cursor:
        rows.append(doc)
    return serialize_many(rows)


@router.get("/t/{code}")
async def tracking_click(code: str, a: str | None = None):
    db = get_db()
    campaign = await db.campaigns.find_one({"tracking_code": code, "active": {"$in": [1, True]}}, {"brand_url": 1, "cpc_rate": 1})
    dest = (campaign or {}).get("brand_url", "").strip()
    if not campaign or not dest.startswith(("http://", "https://")):
        raise HTTPException(404, "Invalid tracking link")

    cpc = float(campaign.get("cpc_rate") or 0)
    try:
        await db.events.insert_one(
            {
                "campaign_id": campaign["_id"],
                "agent_id": a,
                "type": "click",
                "createdAt": datetime.now(timezone.utc),
            }
        )
        record_click(campaign["_id"])
        await increment_campaign_click(str(campaign["_id"]), cpc)
        if a:
            await credit_agent_revenue(a, round(cpc * settings.agent_revenue_share))
    except Exception:
        pass

    return RedirectResponse(dest, status_code=302)


@router.post("/api/conversion")
async def conversion(body: dict):
    session_id = body.get("session_id")
    campaign_id = body.get("campaign_id")
    if not session_id or not campaign_id:
        raise HTTPException(400, "session_id and campaign_id required")

    db = get_db()
    campaign = await db.campaigns.find_one({"_id": oid(campaign_id)})
    if not campaign:
        raise HTTPException(404, "Campaign not found")

    conv_val = float(body.get("conversion_value") or 0)
    pct = float(campaign.get("cpa_percentage") or 0)
    cpa = conv_val * pct / 100 if conv_val and pct else float(campaign.get("cpa_rate") or 0)

    await db.events.insert_one(
        {
            "session_id": session_id,
            "campaign_id": oid(campaign_id),
            "type": "conversion",
            "conversion_value": conv_val,
            "metadata": body.get("metadata"),
            "createdAt": datetime.now(timezone.utc),
        }
    )
    await db.campaigns.update_one({"_id": campaign["_id"]}, {"$inc": {"spent": max(0, cpa)}})
    return {"success": True, "cpa_earned": cpa, "cpa_percentage": pct}
