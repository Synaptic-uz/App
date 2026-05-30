from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from nanoid import generate as nanoid
from pydantic import BaseModel, Field

from app.config import settings
from app.core.bson_utils import oid, serialize_doc, serialize_many
from app.core.deps import AuthUser, get_current_user, require_business
from app.db.mongo import get_db
from app.services.campaign_cache import reload_campaign_cache_bg
from app.services.campaign_research import research_campaign
from app.services.categories import (
    OTHER_CATEGORY_ID,
    build_campaign_profile_text,
    default_subcategory,
    get_category_options,
)
from app.services.embeddings import embed_text
from app.services.offerings import merge_keywords_from_offerings, normalize_offerings
from app.services.vector_store import delete_campaign as delete_vector
from app.services.vector_store import sync_campaign_by_id
from app.services.wallet import WalletError, allocate_on_campaign_create

router = APIRouter(prefix="/api", tags=["campaigns"])


class ResearchBody(BaseModel):
    brand_url: str
    name: str | None = None
    category: str | None = None
    brief: str | None = None


class CampaignCreateBody(BaseModel):
    name: str
    category: str
    brand_url: str
    subcategory: str | None = None
    custom_category: str | None = None
    tagline: str | None = None
    description: str | None = None
    keywords: list[str] | None = None
    niche_keywords: list[str] | None = None
    offerings: list[dict[str, Any]] | None = None
    link_text: str | None = None
    cpc_rate: float | None = 0
    cpa_percentage: float | None = 0
    tone: str | None = "informative"
    budget: float | None = 0


class StatusBody(BaseModel):
    active: int | bool


async def _owner_campaign(campaign_id: str, user_id: str) -> dict:
    c = await get_db().campaigns.find_one({"_id": oid(campaign_id), "owner_id": oid(user_id)})
    if not c:
        raise HTTPException(404, "Kampaniya topilmadi")
    return c


@router.get("/categories")
async def categories():
    return get_category_options()


@router.post("/campaigns/profile-preview")
async def profile_preview(body: dict[str, Any], user: Annotated[AuthUser, Depends(require_business)]):
    data = dict(body)
    if data.get("offerings"):
        data["offerings"] = normalize_offerings(data["offerings"])
    if isinstance(data.get("keywords"), str):
        data["keywords"] = [k.strip() for k in data["keywords"].split(",") if k.strip()]
    text = build_campaign_profile_text(data)
    return {"profile_text": text, "length": len(text), "has_embedding_service": bool(settings.github_token)}


@router.get("/campaigns/{campaign_id}/profile")
async def campaign_profile(campaign_id: str, user: Annotated[AuthUser, Depends(get_current_user)]):
    c = await _owner_campaign(campaign_id, user.id)
    c.pop("embedding", None)
    text = build_campaign_profile_text(c)
    emb = await get_db().campaigns.find_one({"_id": c["_id"]}, {"embedding": 1})
    dims = len(emb.get("embedding") or []) if emb else 0
    return {"profile_text": text, "length": len(text), "embedding_dimensions": dims, "updatedAt": c.get("updatedAt")}


@router.post("/campaigns/research")
async def campaign_research(body: ResearchBody, user: Annotated[AuthUser, Depends(require_business)]):
    if not body.brand_url.startswith(("http://", "https://")):
        raise HTTPException(400, "To‘g‘ri brand URL kiriting (https://...)")
    result = await research_campaign(brand_url=body.brand_url, name=body.name or "", category=body.category or "", brief=body.brief or "")
    if result.get("error"):
        raise HTTPException(503, result["error"])
    return result


@router.get("/campaigns")
async def list_campaigns(user: Annotated[AuthUser, Depends(get_current_user)]):
    filt = {"owner_id": oid(user.id)} if user.role == "business" else {}
    cursor = get_db().campaigns.find(filt, {"embedding": 0}).sort("createdAt", -1)
    rows = []
    async for c in cursor:
        rows.append(serialize_doc(c))
    return rows


@router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str, user: Annotated[AuthUser, Depends(get_current_user)]):
    c = await _owner_campaign(campaign_id, user.id)
    c.pop("embedding", None)
    return serialize_doc(c)


@router.patch("/campaigns/{campaign_id}/status")
async def set_status(campaign_id: str, body: StatusBody, user: Annotated[AuthUser, Depends(require_business)]):
    active = 1 if body.active in (1, True) else 0
    c = await _owner_campaign(campaign_id, user.id)
    await get_db().campaigns.update_one({"_id": c["_id"]}, {"$set": {"active": active}})
    await sync_campaign_by_id(campaign_id)
    await reload_campaign_cache_bg()
    return {"_id": str(c["_id"]), "active": active}


@router.post("/campaigns")
async def create_campaign(body: CampaignCreateBody, user: Annotated[AuthUser, Depends(require_business)]):
    if body.category == OTHER_CATEGORY_ID and not (body.custom_category or "").strip():
        raise HTTPException(400, "«Boshqa» tanlaganda kategoriya nomini yozing")

    offerings = normalize_offerings(body.offerings)
    kw = merge_keywords_from_offerings(body.keywords or [], offerings)
    if not kw:
        raise HTTPException(400, "Kamida bitta kalit so‘z yoki mahsulot/xizmat nomi kerak")

    sub = body.subcategory or default_subcategory(body.category)
    campaign_data = {
        "name": body.name,
        "category": body.category,
        "subcategory": sub,
        "custom_category": (body.custom_category or "").strip(),
        "tagline": body.tagline or "",
        "description": body.description or "",
        "keywords": kw,
        "niche_keywords": body.niche_keywords or [],
        "offerings": offerings,
    }

    embedding = []
    if settings.github_token:
        try:
            embedding = await embed_text(build_campaign_profile_text(campaign_data)) or []
        except Exception:
            pass

    budget_amt = round(float(body.budget or 0))
    now = datetime.now(timezone.utc)
    doc = {
        **campaign_data,
        "brand_url": body.brand_url,
        "link_text": body.link_text or body.name,
        "tracking_code": nanoid(size=10),
        "embedding": embedding,
        "cpc_rate": body.cpc_rate or 0,
        "cpa_percentage": body.cpa_percentage or 0,
        "tone": body.tone or "informative",
        "budget": 0,
        "spent": 0,
        "source": "partner",
        "owner_id": oid(user.id),
        "active": 1 if budget_amt > 0 else 0,
        "stats_impressions": 0,
        "stats_clicks": 0,
        "today_impressions": 0,
        "max_daily_impressions": 1000,
        "last_reset_date": now,
        "createdAt": now,
        "updatedAt": now,
    }

    try:
        result = await get_db().campaigns.insert_one(doc)
        cid = str(result.inserted_id)
        if budget_amt > 0:
            await allocate_on_campaign_create(user.id, cid, body.name, budget_amt)
        doc["_id"] = result.inserted_id
        await sync_campaign_by_id(cid)
        await reload_campaign_cache_bg()
        return {"id": doc["tracking_code"], "_id": cid}
    except WalletError as err:
        raise HTTPException(err.status, err.message, headers={"X-Error-Code": err.code} if err.code else None)


@router.put("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, body: dict[str, Any], user: Annotated[AuthUser, Depends(get_current_user)]):
    c = await _owner_campaign(campaign_id, user.id)
    fields = [
        "name", "category", "subcategory", "custom_category", "tagline", "description",
        "keywords", "niche_keywords", "brand_url", "link_text", "cpc_rate", "cpa_percentage",
        "budget", "active", "tone", "offerings",
    ]
    updates = {}
    for f in fields:
        if f not in body:
            continue
        if f == "offerings":
            updates[f] = normalize_offerings(body[f])
        else:
            updates[f] = body[f]

    if "offerings" in updates:
        updates["keywords"] = merge_keywords_from_offerings(c.get("keywords"), updates["offerings"])

    if settings.github_token:
        merged = {**c, **updates}
        try:
            updates["embedding"] = await embed_text(build_campaign_profile_text(merged)) or []
        except Exception:
            pass

    updates["updatedAt"] = datetime.now(timezone.utc)
    await get_db().campaigns.update_one({"_id": c["_id"]}, {"$set": updates})
    row = await get_db().campaigns.find_one({"_id": c["_id"]})
    await sync_campaign_by_id(campaign_id)
    await reload_campaign_cache_bg()
    return serialize_doc(row)


@router.post("/campaigns/{campaign_id}/refresh-embedding")
async def refresh_embedding(campaign_id: str, user: Annotated[AuthUser, Depends(get_current_user)]):
    c = await _owner_campaign(campaign_id, user.id)
    if not settings.github_token:
        raise HTTPException(500, "Embedding xizmati ulanmagan (GITHUB_TOKEN yo‘q)")
    text = build_campaign_profile_text(c)
    emb = await embed_text(text)
    await get_db().campaigns.update_one({"_id": c["_id"]}, {"$set": {"embedding": emb or []}})
    await sync_campaign_by_id(campaign_id)
    await reload_campaign_cache_bg()
    return {"success": True, "text_used": text}


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, user: Annotated[AuthUser, Depends(get_current_user)]):
    result = await get_db().campaigns.delete_one({"_id": oid(campaign_id), "owner_id": oid(user.id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Kampaniya topilmadi yoki ruxsat yo‘q")
    await delete_vector(campaign_id)
    await reload_campaign_cache_bg()
    return {"success": True}
