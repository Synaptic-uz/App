import logging
import uuid
from typing import Any

from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointIdsList,
    PointStruct,
    VectorParams,
)

from app.config import settings
from app.core.bson_utils import oid
from app.db.mongo import get_db
from app.db.qdrant import get_qdrant, ping_qdrant
from app.utils.timing import timed_async

logger = logging.getLogger(__name__)

VECTOR_SIZE = 1536  # text-embedding-3-small


def is_enabled() -> bool:
    return settings.vector_db_enabled


def campaign_point_id(campaign_id: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"synaptic:campaign:{campaign_id}"))


def _campaign_payload(campaign: dict) -> dict[str, Any]:
    return {
        "campaign_id": str(campaign.get("_id")),
        "name": campaign.get("name") or "",
        "category": campaign.get("category") or "",
        "tracking_code": campaign.get("tracking_code") or "",
        "active": campaign.get("active") not in (0, False),
    }


async def ensure_collection() -> bool:
    client = get_qdrant()
    if not client:
        return False

    names = {c.name for c in (await client.get_collections()).collections}
    if settings.qdrant_collection not in names:
        await client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        logger.info("Qdrant collection created: %s", settings.qdrant_collection)
    return True


async def upsert_campaign(campaign: dict, embedding: list[float] | None = None) -> None:
    if not is_enabled():
        return
    client = get_qdrant()
    if not client:
        return

    vec = embedding or campaign.get("embedding")
    if not vec or len(vec) != VECTOR_SIZE:
        return

    cid = str(campaign.get("_id"))
    active = campaign.get("active") not in (0, False)
    if not active:
        await delete_campaign(cid)
        return

    await client.upsert(
        collection_name=settings.qdrant_collection,
        points=[
            PointStruct(
                id=campaign_point_id(cid),
                vector=vec,
                payload=_campaign_payload(campaign),
            )
        ],
    )


async def delete_campaign(campaign_id: str) -> None:
    if not is_enabled():
        return
    client = get_qdrant()
    if not client:
        return
    await client.delete(
        collection_name=settings.qdrant_collection,
        points_selector=PointIdsList(points=[campaign_point_id(campaign_id)]),
    )


async def search_similar(
    vector: list[float],
    *,
    limit: int | None = None,
    score_threshold: float | None = None,
) -> list[dict[str, Any]]:
    if not is_enabled() or not vector:
        return []

    client = get_qdrant()
    if not client:
        return []

    limit = limit or settings.vector_search_top_k
    threshold = score_threshold if score_threshold is not None else settings.vector_score_threshold

    async with timed_async("vectordb.search", extra={"limit": limit}):
        results = await client.search(
            collection_name=settings.qdrant_collection,
            query_vector=vector,
            limit=limit,
            score_threshold=threshold,
            query_filter=Filter(
                must=[FieldCondition(key="active", match=MatchValue(value=True))]
            ),
        )

    hits = [
        {
            "campaign_id": r.payload.get("campaign_id") if r.payload else None,
            "score": float(r.score),
            "payload": r.payload or {},
        }
        for r in results
        if r.payload and r.payload.get("campaign_id")
    ]
    return hits


async def sync_all_from_mongo() -> int:
    if not is_enabled():
        return 0
    if not await ensure_collection():
        return 0

    db = get_db()
    cursor = db.campaigns.find({"active": {"$in": [1, True]}, "embedding.0": {"$exists": True}})
    count = 0
    async for doc in cursor:
        emb = doc.get("embedding")
        if emb and len(emb) == VECTOR_SIZE:
            await upsert_campaign(doc, emb)
            count += 1
    logger.info("Qdrant sync complete: %d campaigns indexed", count)
    return count


async def sync_campaign_by_id(campaign_id: str) -> None:
    if not is_enabled():
        return
    db = get_db()
    doc = await db.campaigns.find_one({"_id": oid(campaign_id)})
    if not doc:
        await delete_campaign(campaign_id)
        return
    if doc.get("active") in (0, False):
        await delete_campaign(campaign_id)
        return
    await ensure_collection()
    await upsert_campaign(doc)


async def health_status() -> dict[str, Any]:
    if not is_enabled():
        return {"enabled": False, "connected": False}
    ok = await ping_qdrant()
    count = 0
    if ok:
        client = get_qdrant()
        try:
            info = await client.get_collection(settings.qdrant_collection)
            count = info.points_count or 0
        except Exception:
            count = 0
    return {
        "enabled": True,
        "connected": ok,
        "collection": settings.qdrant_collection,
        "points": count,
    }
