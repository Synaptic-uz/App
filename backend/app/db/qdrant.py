import logging

from qdrant_client import AsyncQdrantClient

from app.config import settings

logger = logging.getLogger(__name__)

_client: AsyncQdrantClient | None = None


def get_qdrant() -> AsyncQdrantClient | None:
    global _client
    if not settings.vector_db_enabled:
        return None
    if _client is None:
        _client = AsyncQdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)
    return _client


async def close_qdrant() -> None:
    global _client
    if _client is not None:
        await _client.close()
    _client = None


async def ping_qdrant() -> bool:
    client = get_qdrant()
    if not client:
        return False
    try:
        await client.get_collections()
        return True
    except Exception as err:
        logger.warning("Qdrant ping failed: %s", err)
        return False
