from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.config import settings
from app.core.auth import generate_api_key, hash_api_key
from app.core.bson_utils import oid, serialize_doc, serialize_many
from app.core.deps import AuthUser, get_current_user, require_agent, require_business
from app.db.mongo import get_db
from app.utils.response import AppResponse, AppException
from app.services.campaign_cache import increment_campaign_impression, reload_campaign_cache_bg
from app.services.conversation import build_matching_prompt
from app.services.matcher import find_best_campaign
from app.services.suggestion import (
    build_cta_label,
    build_display_path,
    build_suggestion,
    build_tracking_url,
    format_sponsored_append,
    is_campaign_serve_ready,
)

router = APIRouter(prefix="/api/agents", tags=["agents"])


class SendResultBody(BaseModel):
    prompt: str | None = None
    messages: list[dict[str, Any]] | None = None
    api_key: str | None = None


class RegisterAgentBody(BaseModel):
    username: str
    owner_email: str


class PatchAgentBody(BaseModel):
    active: bool | None = None
    username: str | None = None


async def _resolve_agent(request: Request, body: SendResultBody) -> dict | None:
    api_key = body.api_key or request.headers.get("x-synaptic-key")
    if not api_key:
        return None
    db = get_db()
    agent = await db.agents.find_one({"api_key_hash": hash_api_key(api_key), "active": True})
    if not agent:
        return None
    await db.agents.update_one({"_id": agent["_id"]}, {"$inc": {"total_requests": 1}, "$set": {"last_seen": __import__("datetime").datetime.now(__import__("datetime").timezone.utc)}})
    return agent


def _latest_prompt(body: SendResultBody) -> str | None:
    if body.prompt:
        return body.prompt
    if not body.messages:
        return None
    for m in reversed(body.messages):
        role = m.get("role") or m.get("sender")
        if role in ("user", "bot"):
            text = m.get("content") or m.get("text")
            if text and (role == "user" or m.get("sender") == "user"):
                return str(text)
    for m in reversed(body.messages):
        if (m.get("role") == "user" or m.get("sender") == "user") and (m.get("content") or m.get("text")):
            return str(m.get("content") or m.get("text"))
    return None


@router.post("/send_result")
async def send_result(request: Request, body: SendResultBody, bg: BackgroundTasks):
    agent = await _resolve_agent(request, body)
    if not agent:
        return {"match": False}

    latest = _latest_prompt(body)
    if not latest:
        return {"match": False}

    match_prompt = build_matching_prompt(latest, body.messages or [])
    db = get_db()
    cursor = db.campaigns.find({"active": {"$in": [1, True]}})
    campaigns = []
    async for c in cursor:
        c["_id"] = str(c["_id"])
        if c.get("owner_id"):
            c["owner_id"] = str(c["owner_id"])
        campaigns.append(c)

    try:
        match = await find_best_campaign(latest, campaigns, serving_context={"agentId": agent["username"]}, match_prompt=match_prompt)
        best = match.get("campaign")
        if not best or not is_campaign_serve_ready(best):
            return {"match": False}

        suggestion = build_suggestion(best)
        cta = build_cta_label(best)
        base = settings.public_url or str(request.base_url).rstrip("/")
        tracking = build_tracking_url(base, best.get("tracking_code"), agent["username"])
        if not tracking:
            return {"match": False}

        async def _log():
            await db.events.insert_one(
                {
                    "campaign_id": oid(best["_id"]),
                    "agent_id": agent["username"],
                    "type": "impression",
                    "user_prompt": latest[:500],
                    "createdAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc),
                }
            )
            await increment_campaign_impression(str(best["_id"]), best.get("cpc_rate") or 0)
            await db.agents.update_one({"_id": agent["_id"]}, {"$inc": {"total_impressions": 1}})

        bg.add_task(_log)

        from app.services.categories import display_category

        return {
            "match": True,
            "intent": best.get("category"),
            "suggestion": suggestion,
            "sponsored_line": format_sponsored_append(suggestion, cta),
            "cta_label": cta,
            "tracking_url": tracking,
            "display_path": build_display_path(best.get("tracking_code")),
            "campaign": {
                "name": best.get("name"),
                "category": best.get("category"),
                "category_label": display_category(best),
                "link_text": best.get("link_text"),
                "brand_url": best.get("brand_url"),
            },
        }
    except Exception:
        return {"match": False}


@router.post("/register")
async def register_agent(body: RegisterAgentBody, user: Annotated[AuthUser, Depends(require_agent)]):
    db = get_db()
    if await db.agents.find_one({"username": body.username}):
        raise AppException("agents.username_taken", http_status=400)
    api_key = generate_api_key()
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    await db.agents.insert_one(
        {
            "username": body.username,
            "owner_email": body.owner_email,
            "owner_id": oid(user.id),
            "api_key_hash": hash_api_key(api_key),
            "active": True,
            "total_requests": 0,
            "total_impressions": 0,
            "total_clicks": 0,
            "revenue_earned": 0,
            "createdAt": now,
            "updatedAt": now,
        }
    )
    return AppResponse.success({"api_key": api_key}, status_code="agents.registered")


@router.get("", include_in_schema=False)
@router.get("/")
async def list_agents(user: Annotated[AuthUser, Depends(get_current_user)]):
    db = get_db()
    filt = {"owner_id": oid(user.id)} if user.role == "agent" else {}
    cursor = db.agents.find(filt).sort("total_clicks", -1)
    agents = []
    async for a in cursor:
        a.pop("api_key_hash", None)
        agents.append(serialize_doc(a))
    return AppResponse.success(agents)


@router.patch("/{agent_id}")
async def patch_agent(agent_id: str, body: PatchAgentBody, user: Annotated[AuthUser, Depends(get_current_user)]):
    db = get_db()
    agent = await db.agents.find_one({"_id": oid(agent_id), "owner_id": oid(user.id)})
    if not agent:
        raise AppException("agents.not_found", http_status=404)
    updates = {}
    if body.active is not None:
        updates["active"] = bool(body.active)
    if body.username is not None:
        taken = await db.agents.find_one({"username": body.username, "_id": {"$ne": agent["_id"]}})
        if taken:
            raise AppException("agents.username_taken", http_status=400)
        updates["username"] = body.username
    if updates:
        await db.agents.update_one({"_id": agent["_id"]}, {"$set": updates})
    row = await db.agents.find_one({"_id": agent["_id"]})
    row.pop("api_key_hash", None)
    return AppResponse.success(serialize_doc(row))


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str, user: Annotated[AuthUser, Depends(get_current_user)]):
    result = await get_db().agents.delete_one({"_id": oid(agent_id), "owner_id": oid(user.id)})
    if result.deleted_count == 0:
        raise AppException("agents.not_found", http_status=404)
    return AppResponse.success(None)
