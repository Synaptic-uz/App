from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> bool:
    global _client, _db
    if _client is not None:
        return True
    _client = AsyncIOMotorClient(
        settings.mongodb_uri,
        maxPoolSize=20,
        serverSelectionTimeoutMS=10_000,
        socketTimeoutMS=120_000,
    )
    _db = _client.get_default_database()
    await _client.admin.command("ping")
    return True


async def close_db() -> None:
    global _client, _db
    if _client is not None:
        _client.close()
    _client = None
    _db = None


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not connected")
    return _db


def is_db_connected() -> bool:
    return _client is not None and _db is not None
