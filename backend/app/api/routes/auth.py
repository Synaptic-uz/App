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
from app.utils.response import AppResponse, AppException

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
        raise AppException("auth.email_already_registered", http_status=400)

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
        data = await _issue_login(doc, request)
        return AppResponse.success(data)
    except Exception:
        if not is_db_connected():
            raise AppException("error.db_connection_failed", http_status=503)
        raise AppException("auth.registration_failed", http_status=500)


@router.post("/login")
async def login(body: LoginBody, request: Request):
    db = get_db()
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password"]):
        raise AppException("auth.invalid_credentials", http_status=401)
    data = await _issue_login(user, request)
    return AppResponse.success(data)


@router.get("/me")
async def me(user: Annotated[AuthUser, Depends(get_current_user)]):
    db = get_db()
    row = await db.users.find_one({"_id": oid(user.id)}, {"password": 0, "refresh_token_hash": 0})
    if not row:
        raise AppException("auth.user_not_found", http_status=404)
    stats = await get_account_stats(user.id, user.role)
    return AppResponse.success({"user": serialize_user(row), "stats": stats})


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
        data = await _update_profile(user, body)
        return AppResponse.success(data)
    except Exception:
        raise AppException("auth.profile_update_failed", http_status=500)


@router.patch("/password")
@router.put("/password")
async def change_password(body: PasswordBody, request: Request, user: Annotated[AuthUser, Depends(get_current_user)]):
    if len(body.new_password) < 6:
        raise AppException("password_too_short", status_code=400)
    db = get_db()
    row = await db.users.find_one({"_id": oid(user.id)})
    if not row or not verify_password(body.current_password, row["password"]):
        raise AppException("auth.current_password_incorrect", http_status=401)
    await db.users.update_one({"_id": row["_id"]}, {"$set": {"password": hash_password(body.new_password)}})
    await revoke_all_auth_sessions(user.id)
    row = await db.users.find_one({"_id": row["_id"]})
    data = await _issue_login(row, request)
    return AppResponse.success(data)


@router.post("/refresh")
async def refresh(body: RefreshBody):
    if not body.refreshToken:
        raise AppException("auth.refresh_token_required", http_status=400)
    try:
        payload = verify_refresh_token(body.refreshToken)
    except jwt.PyJWTError:
        raise AppException("auth.refresh_token_expired", http_status=403)

    db = get_db()
    user = await db.users.find_one({"_id": oid(payload["id"])})
    if not user:
        raise AppException("auth.user_not_found", http_status=403)

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
        raise AppException("auth.refresh_token_invalid", http_status=403)

    pair = issue_auth_pair(user, sid)
    if payload.get("sid"):
        await rotate_auth_session(sid, str(user["_id"]), pair["refreshToken"])
    else:
        await create_auth_session(str(user["_id"]), pair["refreshToken"], {}, sid)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"refresh_token_hash": None}})
    return AppResponse.success(pair)


@router.post("/logout")
async def logout(user: Annotated[AuthUser, Depends(get_current_user)]):
    if user.sid:
        await revoke_auth_session(user.sid, user.id)
    else:
        await get_db().users.update_one({"_id": oid(user.id)}, {"$set": {"refresh_token_hash": None}})
    return AppResponse.success(None)


@router.get("/sessions")
async def sessions(user: Annotated[AuthUser, Depends(get_current_user)]):
    data = await list_auth_sessions(user.id, user.sid)
    return AppResponse.success({"sessions": data})


@router.delete("/sessions/{session_id}")
async def revoke_session(session_id: str, user: Annotated[AuthUser, Depends(get_current_user)]):
    if session_id == user.sid:
        raise AppException("auth.session_revoke_current_error", http_status=400)
    await revoke_auth_session(session_id, user.id)
    return AppResponse.success(None)


@router.post("/sessions/revoke-all")
async def revoke_all(user: Annotated[AuthUser, Depends(get_current_user)]):
    await revoke_all_auth_sessions(user.id, user.sid)
    return AppResponse.success(None)
