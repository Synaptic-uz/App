import re
from datetime import datetime, timedelta, timezone

from app.config import settings
from app.core.auth import hash_refresh_token
from app.core.bson_utils import oid
from app.db.mongo import get_db


def new_session_id() -> str:
    import secrets

    return secrets.token_hex(16)


def _session_ttl() -> timedelta:
    raw = settings.jwt_refresh_expires
    m = re.match(r"^(\d+)([dhms])?$", str(raw).strip(), re.I)
    if not m:
        return timedelta(days=7)
    n = int(m.group(1))
    unit = (m.group(2) or "d").lower()
    mult = {"d": 86400, "h": 3600, "m": 60, "s": 1}
    return timedelta(seconds=n * mult.get(unit, 86400))


def _ua_label(ua: str = "") -> str:
    s = str(ua)
    if re.search(r"iPhone|Android|Mobile", s, re.I):
        return "Mobil brauzer"
    if "Chrome" in s:
        return "Chrome"
    if "Firefox" in s:
        return "Firefox"
    if "Safari" in s:
        return "Safari"
    return "Brauzer"


async def create_auth_session(
    user_id: str,
    refresh_token: str,
    meta: dict | None = None,
    existing_sid: str | None = None,
) -> str:
    db = get_db()
    sid = existing_sid or new_session_id()
    meta = meta or {}
    expires = datetime.now(timezone.utc) + _session_ttl()
    await db.authsessions.insert_one(
        {
            "session_id": sid,
            "user_id": oid(user_id),
            "refresh_token_hash": hash_refresh_token(refresh_token),
            "user_agent": meta.get("userAgent", ""),
            "ip": meta.get("ip", ""),
            "label": meta.get("label") or _ua_label(meta.get("userAgent", "")),
            "last_used_at": datetime.now(timezone.utc),
            "expires_at": expires,
            "revoked_at": None,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
        }
    )
    return sid


async def touch_auth_session(sid: str) -> None:
    db = get_db()
    await db.authsessions.update_one(
        {"session_id": sid, "revoked_at": None},
        {"$set": {"last_used_at": datetime.now(timezone.utc)}},
    )


async def is_auth_session_active(sid: str | None, user_id: str) -> bool:
    if not sid or not user_id:
        return False
    db = get_db()
    row = await db.authsessions.find_one(
        {
            "session_id": sid,
            "user_id": oid(user_id),
            "revoked_at": None,
            "expires_at": {"$gt": datetime.now(timezone.utc)},
        }
    )
    return row is not None


async def rotate_auth_session(sid: str, user_id: str, new_refresh_token: str) -> bool:
    db = get_db()
    result = await db.authsessions.update_one(
        {"session_id": sid, "user_id": oid(user_id), "revoked_at": None},
        {
            "$set": {
                "refresh_token_hash": hash_refresh_token(new_refresh_token),
                "last_used_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + _session_ttl(),
            }
        },
    )
    return result.modified_count > 0


async def revoke_auth_session(sid: str, user_id: str) -> None:
    db = get_db()
    await db.authsessions.update_one(
        {"session_id": sid, "user_id": oid(user_id)},
        {"$set": {"revoked_at": datetime.now(timezone.utc)}},
    )


async def revoke_all_auth_sessions(user_id: str, except_sid: str | None = None) -> None:
    db = get_db()
    filt: dict = {"user_id": oid(user_id), "revoked_at": None}
    if except_sid:
        filt["session_id"] = {"$ne": except_sid}
    await db.authsessions.update_many(filt, {"$set": {"revoked_at": datetime.now(timezone.utc)}})


async def list_auth_sessions(user_id: str, current_sid: str | None = None) -> list[dict]:
    db = get_db()
    cursor = db.authsessions.find(
        {
            "user_id": oid(user_id),
            "revoked_at": None,
            "expires_at": {"$gt": datetime.now(timezone.utc)},
        }
    ).sort("last_used_at", -1)
    rows = []
    async for r in cursor:
        rows.append(
            {
                "id": r["session_id"],
                "label": r.get("label") or "Qurilma",
                "user_agent": r.get("user_agent", ""),
                "ip": r.get("ip", ""),
                "created_at": r.get("createdAt"),
                "last_used_at": r.get("last_used_at"),
                "expires_at": r.get("expires_at"),
                "current": r["session_id"] == str(current_sid),
            }
        )
    return rows


async def validate_refresh_for_session(sid: str, user_id: str, refresh_token: str) -> bool:
    db = get_db()
    row = await db.authsessions.find_one(
        {
            "session_id": sid,
            "user_id": oid(user_id),
            "revoked_at": None,
            "expires_at": {"$gt": datetime.now(timezone.utc)},
        }
    )
    if not row:
        return False
    return row["refresh_token_hash"] == hash_refresh_token(refresh_token)
