from typing import Annotated, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.enrichment import enrich_response

router = APIRouter(prefix="/api", tags=["enrich"])


class EnrichBody(BaseModel):
    prompt: str
    answer_only: bool = False
    messages: list[dict[str, Any]] | None = None
    session_id: str | None = None
    parse_mode: str = "Markdown"


@router.post("/enrich")
async def enrich(body: EnrichBody):
    if not body.prompt:
        raise HTTPException(400, "Prompt is required")
    try:
        result = await enrich_response(
            body.prompt,
            body.session_id,
            answer_only=body.answer_only,
            messages=body.messages or [],
            parse_mode=body.parse_mode,
        )
        return {**result, "parse_mode": body.parse_mode}
    except Exception:
        raise HTTPException(500, "Failed to enrich response")
