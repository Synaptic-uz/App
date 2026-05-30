import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def generate_api_key() -> str:
    return f"sk-synaptic-{secrets.token_hex(16)}"


def _access_expires() -> timedelta:
    raw = settings.jwt_access_expires
    return _parse_duration(raw)


def _refresh_expires() -> timedelta:
    raw = settings.jwt_refresh_expires
    return _parse_duration(raw)


def _parse_duration(raw: str) -> timedelta:
    import re

    m = re.match(r"^(\d+)([dhms])?$", str(raw).strip(), re.I)
    if not m:
        return timedelta(days=7)
    n = int(m.group(1))
    unit = (m.group(2) or "d").lower()
    mult = {"d": 86400, "h": 3600, "m": 60, "s": 1}
    return timedelta(seconds=n * mult.get(unit, 86400))


def generate_access_token(user_id: str, email: str, role: str, sid: str | None) -> str:
    payload = {
        "id": str(user_id),
        "email": email,
        "role": role,
        "type": "access",
        "sid": sid,
        "exp": datetime.now(timezone.utc) + _access_expires(),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def generate_refresh_token(user_id: str, email: str, sid: str | None) -> str:
    payload = {
        "id": str(user_id),
        "email": email,
        "type": "refresh",
        "sid": sid,
        "exp": datetime.now(timezone.utc) + _refresh_expires(),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def issue_auth_pair(user: dict, sid: str | None) -> dict:
    uid = str(user["_id"])
    access = generate_access_token(uid, user["email"], user["role"], sid)
    refresh = generate_refresh_token(uid, user["email"], sid)
    return {
        "token": access,
        "accessToken": access,
        "refreshToken": refresh,
        "sessionId": sid,
        "user": {"id": uid, "email": user["email"], "role": user["role"]},
    }


def verify_access_token(token: str) -> dict:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    if payload.get("type") == "refresh":
        raise jwt.InvalidTokenError("Access token required")
    return payload


def verify_refresh_token(token: str) -> dict:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    if payload.get("type") != "refresh":
        raise jwt.InvalidTokenError("Invalid refresh token")
    return payload
