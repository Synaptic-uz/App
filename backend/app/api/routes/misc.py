from fastapi import APIRouter

from app.db.mongo import is_db_connected
from app.services.campaign_cache import bootstrap_ranking_stats, reload_campaign_cache_bg
from app.services.ranking import clear_serving_state
from app.services.vector_store import health_status as vector_health, sync_all_from_mongo

router = APIRouter(prefix="/api", tags=["ops"])

_analytics_cache_clear = None


@router.get("/health")
async def health():
    return {
        "ok": True,
        "service": "synaptic-ai-fastapi",
        "db": is_db_connected(),
        "vectordb": await vector_health(),
        "queue": {"running": False, "active": 0, "pending": 0, "recent": []},
    }


@router.post("/cache/clear")
async def clear_cache():
    global _analytics_cache_clear
    from app.api.routes import analytics as analytics_mod

    analytics_mod._analytics_cache = {"data": None, "ts": 0}
    clear_serving_state()
    await reload_campaign_cache_bg()
    await bootstrap_ranking_stats()
    synced = await sync_all_from_mongo()
    return {"success": True, "vectordb_synced": synced}
