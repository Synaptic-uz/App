from dataclasses import dataclass
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.auth import verify_access_token
from app.core.bson_utils import oid, serialize_doc
from app.core.sessions import is_auth_session_active, touch_auth_session
from app.db.mongo import get_db

bearer = HTTPBearer(auto_error=False)


@dataclass
class AuthUser:
    id: str
    email: str
    role: str
    sid: str | None = None


def request_meta(request: Request) -> dict:
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "")
    return {"userAgent": request.headers.get("user-agent", ""), "ip": ip}


async def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> AuthUser:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Kirish tokeni talab qilinadi")
    try:
        payload = verify_access_token(creds.credentials)
    except jwt.PyJWTError:
        raise HTTPException(status_code=403, detail="Token noto‘g‘ri yoki muddati tugagan", headers={"X-Error-Code": "TOKEN_EXPIRED"})

    sid = payload.get("sid")
    if sid:
        active = await is_auth_session_active(sid, payload["id"])
        if not active:
            raise HTTPException(status_code=403, detail="Sessiya tugagan yoki bekor qilingan", headers={"X-Error-Code": "SESSION_REVOKED"})
        await touch_auth_session(sid)

    return AuthUser(id=str(payload["id"]), email=payload["email"], role=payload["role"], sid=sid)


async def require_business(user: Annotated[AuthUser, Depends(get_current_user)]) -> AuthUser:
    if user.role != "business":
        raise HTTPException(status_code=403, detail="Faqat biznes hisobi uchun")
    return user


async def require_agent(user: Annotated[AuthUser, Depends(get_current_user)]) -> AuthUser:
    if user.role != "agent":
        raise HTTPException(status_code=403, detail="Faqat agent hisoblari uchun")
    return user


def serialize_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "display_name": user.get("display_name") or "",
        "company_name": user.get("company_name") or "",
        "phone": user.get("phone") or "",
        "wallet_balance": user.get("wallet_balance") or 0,
        "createdAt": user.get("createdAt"),
    }


async def get_account_stats(user_id: str, role: str) -> dict:
    db = get_db()
    uid = oid(user_id)
    if role == "business":
        user = await db.users.find_one({"_id": uid}, {"wallet_balance": 1})
        campaigns = await db.campaigns.find({"owner_id": uid}, {"budget": 1, "spent": 1}).to_list(500)
        active = await db.campaigns.count_documents({"owner_id": uid, "active": {"$in": [1, True]}})
        from app.services.wallet import campaign_budget_remaining, get_wallet_summary

        wallet = None
        try:
            wallet = await get_wallet_summary(user_id)
        except Exception:
            pass
        return {
            "campaigns": len(campaigns),
            "active_campaigns": active,
            "wallet_balance": user.get("wallet_balance", 0) if user else 0,
            "allocated_remaining": wallet.get("allocated_remaining", 0) if wallet else 0,
        }
    if role == "agent":
        agents = await db.agents.find({"owner_id": uid}, {"total_clicks": 1, "total_requests": 1}).to_list(100)
        return {
            "agents": len(agents),
            "total_clicks": sum(a.get("total_clicks") or 0 for a in agents),
            "total_requests": sum(a.get("total_requests") or 0 for a in agents),
        }
    return {}


async def load_user(user_id: str) -> dict | None:
    db = get_db()
    return await db.users.find_one({"_id": oid(user_id)})
