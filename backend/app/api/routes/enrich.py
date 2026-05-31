from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.enrichment import enrich_response
from app.utils.response import AppResponse, AppException

router = APIRouter(prefix="/api/enrich", tags=["enrich"])


class EnrichBody(BaseModel):
    prompt: str
    answer_only: bool = False
    messages: list[dict[str, Any]] | None = None
    session_id: str | None = None
    parse_mode: str = "Markdown"


@router.post("")
async def enrich(body: EnrichBody):
    if not body.prompt:
        raise AppException("enrich.prompt_required", http_status=400)
    try:
        result = await enrich_response(
            body.prompt,
            body.session_id,
            answer_only=body.answer_only,
            messages=body.messages or [],
            parse_mode=body.parse_mode,
        )
        return AppResponse.success({**result, "parse_mode": body.parse_mode})
    except Exception:
        raise AppException("enrich.failed", http_status=500)
