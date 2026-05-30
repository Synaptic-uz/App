import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db.mongo import get_db, is_db_connected
from app.services.conversation import build_matching_prompt
from app.services.matcher import find_best_campaign
from app.services.ranking import sync_campaign_stats
from app.utils.timing import timed_async, timed_async

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["ai"])


class MatchRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    messages: list[dict[str, Any]] | None = None
    agent_id: str | None = None
    session_id: str | None = None
    record_serve: bool = True


class MatchResponse(BaseModel):
    match: bool
    method: str | None = None
    score: float | None = None
    campaign_id: str | None = None
    campaign_name: str | None = None
    category: str | None = None
    tracking_code: str | None = None
    candidate_count: int | None = None


async def _load_active_campaigns() -> list[dict]:
    db = get_db()
    cursor = db.campaigns.find({"active": {"$in": [1, True]}})
    campaigns = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if doc.get("owner_id"):
            doc["owner_id"] = str(doc["owner_id"])
        campaigns.append(doc)
    sync_campaign_stats(campaigns)
    return campaigns


@router.post("/match", response_model=MatchResponse)
async def match_campaign(body: MatchRequest):
    if not is_db_connected():
        raise HTTPException(status_code=503, detail="Database not connected")

    prompt_preview = body.prompt[:60].replace("\n", " ")

    async with timed_async("match.prompt_build", extra={"prompt": f'"{prompt_preview}..."'}):
        match_prompt = build_matching_prompt(body.prompt, body.messages or [])

    async with timed_async("match.db_load", extra={"agent": body.agent_id or "-"}):
        campaigns = await _load_active_campaigns()

    serving_context = {}
    if body.agent_id:
        serving_context["agentId"] = body.agent_id
    if body.session_id:
        serving_context["sessionId"] = body.session_id

    async with timed_async(
        "match.find_best",
        extra={"campaigns": len(campaigns), "agent": body.agent_id or "-"},
    ):
        result = await find_best_campaign(
            body.prompt,
            campaigns,
            serving_context=serving_context or None,
            record_serve=body.record_serve,
            match_prompt=match_prompt,
        )

    campaign = result.get("campaign")
    if not campaign:
        logger.info(
            "[perf] match.result no_match | method=%s | campaigns=%s",
            result.get("method"),
            len(campaigns),
        )
        return MatchResponse(match=False, method=result.get("method"))

    logger.info(
        "[perf] match.result hit | campaign=%s | score=%.3f | method=%s | candidates=%s",
        campaign.get("name"),
        result.get("score") or 0,
        result.get("method"),
        result.get("candidateCount"),
    )

    return MatchResponse(
        match=True,
        method=result.get("method"),
        score=result.get("score"),
        campaign_id=str(campaign.get("_id")),
        campaign_name=campaign.get("name"),
        category=campaign.get("category"),
        tracking_code=campaign.get("tracking_code"),
        candidate_count=result.get("candidateCount"),
    )
