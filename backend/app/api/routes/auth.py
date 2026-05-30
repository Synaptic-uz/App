from datetime import datetime, timezone
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from app.config import settings
from app.core.auth import (
    hash_password,
    issue_auth_pair,
    verify_password,
    verify_refresh_token,
    hash_refresh_token,
)
from app.core.bson_utils import oid, serialize_doc
from app.core.deps import AuthUser, get_account_stats, get_current_user, request_meta, serialize_user
from app.core.sessions import (
    create_auth_session,
    list_auth_sessions,
    new_session_id,
    revoke_all_auth_sessions,
    revoke_auth_session,
    rotate_auth_session,
    validate_refresh_for_session,
)
from app.db.mongo import get_db, is_db_connected

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterBody(BaseModel):
    email: EmailStr
    password: str
    role: str = Field(pattern="^(business|agent)$")


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ProfileBody(BaseModel):
    display_name: str | None = None
    company_name: str | None = None
    phone: str | None = None


class PasswordBody(BaseModel):
    current_password: str
    new_password: str


class RefreshBody(BaseModel):
    refreshToken: str


async def _issue_login(user: dict, request: Request) -> dict:
    meta = request_meta(request)
    sid = new_session_id()
    pair = issue_auth_pair(user, sid)
    await create_auth_session(str(user["_id"]), pair["refreshToken"], meta, sid)
    await get_db().users.update_one({"_id": user["_id"]}, {"$set": {"refresh_token_hash": None}})
    return pair


@router.post("/register")
async def register(body: RegisterBody, request: Request):
    db = get_db()
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(400, "Bu email allaqachon ro‘yxatdan o‘tgan")

    wallet_seed = settings.initial_wallet_balance if body.role == "business" else 0
    now = datetime.now(timezone.utc)
    doc = {
        "email": body.email.lower(),
        "password": hash_password(body.password),
        "role": body.role,
        "display_name": "",
        "company_name": "",
        "phone": "",
        "wallet_balance": max(0, wallet_seed),
        "refresh_token_hash": None,
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    try:
        return await _issue_login(doc, request)
    except Exception:
        if not is_db_connected():
            raise HTTPException(503, "Ma’lumotlar bazasiga ulanib bo‘lmadi. Serverni qayta ishga tushiring.")
        raise HTTPException(500, "Ro‘yxatdan o‘tish muvaffaqiyatsiz")


@router.post("/login")
async def login(body: LoginBody, request: Request):
    db = get_db()
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(400, "Email yoki parol noto‘g‘ri")
    return await _issue_login(user, request)


@router.get("/me")
async def me(user: Annotated[AuthUser, Depends(get_current_user)]):
    db = get_db()
    row = await db.users.find_one({"_id": oid(user.id)}, {"password": 0, "refresh_token_hash": 0})
    if not row:
        raise HTTPException(404, "Foydalanuvchi topilmadi")
    stats = await get_account_stats(user.id, user.role)
    return {"user": serialize_user(row), "stats": stats}


async def _update_profile(user: AuthUser, body: ProfileBody):
    db = get_db()
    updates = {}
    if body.display_name is not None:
        updates["display_name"] = body.display_name.strip()[:80]
    if body.company_name is not None:
        updates["company_name"] = body.company_name.strip()[:120]
    if body.phone is not None:
        updates["phone"] = body.phone.strip()[:24]
    if updates:
        await db.users.update_one({"_id": oid(user.id)}, {"$set": updates})
    row = await db.users.find_one({"_id": oid(user.id)})
    stats = await get_account_stats(user.id, user.role)
    return {"user": serialize_user(row), "stats": stats}


@router.patch("/profile")
@router.put("/profile")
async def update_profile(body: ProfileBody, user: Annotated[AuthUser, Depends(get_current_user)]):
    try:
        return await _update_profile(user, body)
    except Exception:
        raise HTTPException(500, "Profil yangilanmadi")


@router.patch("/password")
@router.put("/password")
async def change_password(body: PasswordBody, request: Request, user: Annotated[AuthUser, Depends(get_current_user)]):
    if len(body.new_password) < 6:
        raise HTTPException(400, "Yangi parol kamida 6 belgidan iborat bo‘lishi kerak")
    db = get_db()
    row = await db.users.find_one({"_id": oid(user.id)})
    if not row or not verify_password(body.current_password, row["password"]):
        raise HTTPException(400, "Joriy parol noto‘g‘ri")
    await db.users.update_one({"_id": row["_id"]}, {"$set": {"password": hash_password(body.new_password)}})
    await revoke_all_auth_sessions(user.id)
    row = await db.users.find_one({"_id": row["_id"]})
    return await _issue_login(row, request)


@router.post("/refresh")
async def refresh(body: RefreshBody):
    if not body.refreshToken:
        raise HTTPException(400, "Refresh token talab qilinadi")
    try:
        payload = verify_refresh_token(body.refreshToken)
    except jwt.PyJWTError:
        raise HTTPException(403, detail="Refresh token muddati tugagan", headers={"X-Error-Code": "REFRESH_EXPIRED"})

    db = get_db()
    user = await db.users.find_one({"_id": oid(payload["id"])})
    if not user:
        raise HTTPException(403, "Foydalanuvchi topilmadi")

    sid = payload.get("sid")
    valid = False
    if sid:
        valid = await validate_refresh_for_session(sid, str(user["_id"]), body.refreshToken)
    else:
        h = hash_refresh_token(body.refreshToken)
        valid = bool(user.get("refresh_token_hash") and user["refresh_token_hash"] == h)
        if valid:
            sid = new_session_id()

    if not valid:
        raise HTTPException(403, detail="Refresh token yaroqsiz", headers={"X-Error-Code": "REFRESH_EXPIRED"})

    pair = issue_auth_pair(user, sid)
    if payload.get("sid"):
        await rotate_auth_session(sid, str(user["_id"]), pair["refreshToken"])
    else:
        await create_auth_session(str(user["_id"]), pair["refreshToken"], {}, sid)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"refresh_token_hash": None}})
    return pair


@router.post("/logout")
async def logout(user: Annotated[AuthUser, Depends(get_current_user)]):
    if user.sid:
        await revoke_auth_session(user.sid, user.id)
    else:
        await get_db().users.update_one({"_id": oid(user.id)}, {"$set": {"refresh_token_hash": None}})
    return {"ok": True}


@router.get("/sessions")
async def sessions(user: Annotated[AuthUser, Depends(get_current_user)]):
    return {"sessions": await list_auth_sessions(user.id, user.sid)}


@router.delete("/sessions/{session_id}")
async def revoke_session(session_id: str, user: Annotated[AuthUser, Depends(get_current_user)]):
    if session_id == user.sid:
        raise HTTPException(400, "Joriy sessiyani bu yerda emas, chiqish tugmasidan foydalaning")
    await revoke_auth_session(session_id, user.id)
    return {"ok": True}


@router.post("/sessions/revoke-all")
async def revoke_all(user: Annotated[AuthUser, Depends(get_current_user)]):
    await revoke_all_auth_sessions(user.id, user.sid)
    return {"ok": True}
