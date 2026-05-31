import asyncio
import platform
import time
from datetime import datetime, timezone

from fastapi import APIRouter

from app.config import settings
from app.db.mongo import get_db, is_db_connected
from app.db.qdrant import ping_qdrant, get_qdrant
from app.services.campaign_cache import bootstrap_ranking_stats, reload_campaign_cache_bg
from app.services.embeddings import embed_text, _embedding_cache
from app.services.ranking import clear_serving_state, _ctr_by_campaign
from app.services.categories import get_category_options
from app.services.vector_store import (
    health_status as vector_health,
    is_enabled as vector_enabled,
    sync_all_from_mongo,
    VECTOR_SIZE,
)
from app.utils.response import AppResponse

router = APIRouter(prefix="/api", tags=["ops"])

_boot_time = time.time()


@router.get("/categories")
async def categories():
    return AppResponse.success(get_category_options())


async def _db_diagnostics() -> dict:
    """Deep MongoDB diagnostics with collection stats."""
    if not is_db_connected():
        return {"connected": False, "latency_ms": None, "collections": {}}

    db = get_db()
    t0 = time.perf_counter()
    try:
        await db.command("ping")
        latency = round((time.perf_counter() - t0) * 1000, 2)
    except Exception:
        latency = None

    stats = {}
    for col_name in ("users", "campaigns", "agents", "events", "sessions", "wallets", "wallet_transactions"):
        try:
            count = await db[col_name].estimated_document_count()
            stats[col_name] = count
        except Exception:
            stats[col_name] = -1

    active_campaigns = 0
    embedded_campaigns = 0
    try:
        active_campaigns = await db.campaigns.count_documents({"active": {"$in": [1, True]}})
        embedded_campaigns = await db.campaigns.count_documents(
            {"active": {"$in": [1, True]}, "embedding.0": {"$exists": True}}
        )
    except Exception:
        pass

    return {
        "connected": True,
        "latency_ms": latency,
        "collections": stats,
        "active_campaigns": active_campaigns,
        "embedded_campaigns": embedded_campaigns,
    }


async def _vector_diagnostics() -> dict:
    """Deep Qdrant vector DB diagnostics."""
    if not vector_enabled():
        return {"enabled": False, "connected": False, "collection": None}

    ok = await ping_qdrant()
    result = {
        "enabled": True,
        "connected": ok,
        "url": settings.qdrant_url,
        "collection": settings.qdrant_collection,
        "vector_size": VECTOR_SIZE,
        "search_top_k": settings.vector_search_top_k,
        "score_threshold": settings.vector_score_threshold,
        "points": 0,
        "segments": 0,
    }

    if ok:
        client = get_qdrant()
        try:
            info = await client.get_collection(settings.qdrant_collection)
            result["points"] = info.points_count or 0
            result["segments"] = info.segments_count or 0
            result["status"] = str(info.status)
        except Exception as e:
            result["error"] = str(e)

    return result


async def _embedding_diagnostics() -> dict:
    """Embedding service diagnostics with live probe."""
    has_token = bool(settings.github_token)
    result = {
        "enabled": has_token,
        "model": settings.embedding_model,
        "timeout_ms": settings.embedding_timeout_ms,
        "cache_size": len(_embedding_cache),
        "cache_max": 2000,
        "probe": None,
    }

    if has_token:
        t0 = time.perf_counter()
        try:
            vec = await embed_text("health check test probe", timeout_ms=8000)
            latency = round((time.perf_counter() - t0) * 1000, 1)
            result["probe"] = {
                "ok": vec is not None and len(vec) > 0,
                "latency_ms": latency,
                "dimensions": len(vec) if vec else 0,
            }
        except Exception as e:
            latency = round((time.perf_counter() - t0) * 1000, 1)
            result["probe"] = {
                "ok": False,
                "latency_ms": latency,
                "error": str(e),
            }

    return result


def _matching_diagnostics() -> dict:
    """AI matching engine diagnostics."""
    return {
        "weights": {
            "bid": settings.ad_weight_bid,
            "relevance": settings.ad_weight_relevance,
            "ctr": settings.ad_weight_ctr,
            "randomness": settings.ad_weight_random,
        },
        "top_k": settings.ad_top_k,
        "recent_window": settings.ad_recent_window,
        "max_same_in_window": settings.ad_max_same_in_window,
        "max_owner_in_window": settings.ad_max_owner_in_window,
        "tracked_campaigns": len(_ctr_by_campaign),
    }


@router.get("/health")
async def health():
    """Comprehensive health check for all subsystems."""
    uptime_s = round(time.time() - _boot_time)
    hours, remainder = divmod(uptime_s, 3600)
    minutes, secs = divmod(remainder, 60)

    db_diag, vec_diag, emb_diag = await asyncio.gather(
        _db_diagnostics(),
        _vector_diagnostics(),
        _embedding_diagnostics(),
    )
    match_diag = _matching_diagnostics()

    all_ok = (
        db_diag.get("connected", False)
        and (not vec_diag.get("enabled") or vec_diag.get("connected", False))
    )

    return AppResponse.success({
        "service": "synaptic-ai-fastapi",
        "version": "1.0.0",
        "status": "healthy" if all_ok else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime": f"{hours}h {minutes}m {secs}s",
        "uptime_seconds": uptime_s,
        "environment": {
            "python": platform.python_version(),
            "platform": platform.system(),
            "port": settings.port,
        },
        "database": db_diag,
        "vectordb": vec_diag,
        "embedding": emb_diag,
        "matching": match_diag,
    })


@router.get("/health/ping")
async def health_ping():
    """Lightweight ping for load balancers and uptime monitors."""
    return AppResponse.success({
        "pong": True,
        "ts": datetime.now(timezone.utc).isoformat(),
        "db": is_db_connected(),
    })


@router.post("/cache/clear")
async def clear_cache():
    global _analytics_cache_clear
    from app.api.routes import analytics as analytics_mod

    analytics_mod._analytics_cache = {"data": None, "ts": 0}
    clear_serving_state()
    await reload_campaign_cache_bg()
    await bootstrap_ranking_stats()
    synced = await sync_all_from_mongo()
    return AppResponse.success({"vectordb_synced": synced})
