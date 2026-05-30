from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.core.deps import AuthUser, require_business
from app.services.campaign_cache import reload_campaign_cache_bg
from app.services.wallet import (
    WalletError,
    allocate_to_campaign,
    deallocate_from_campaign,
    deposit_wallet,
    get_wallet_summary,
    get_wallet_transactions,
)

router = APIRouter(prefix="/api/wallet", tags=["wallet"])


class DepositBody(BaseModel):
    amount: float
    note: str | None = None


class AllocateBody(BaseModel):
    campaign_id: str
    amount: float


class DeallocateBody(BaseModel):
    campaign_id: str
    amount: float | None = None


@router.get("")
async def wallet(user: Annotated[AuthUser, Depends(require_business)]):
    try:
        return await get_wallet_summary(user.id)
    except Exception as err:
        raise HTTPException(500, str(err) or "Hamyon yuklanmadi")


@router.get("/transactions")
async def transactions(user: Annotated[AuthUser, Depends(require_business)]):
    return {"transactions": await get_wallet_transactions(user.id)}


@router.post("/deposit")
async def deposit(body: DepositBody, user: Annotated[AuthUser, Depends(require_business)]):
    if not settings.allow_mock_deposit:
        raise HTTPException(403, "To‘ldirish hozircha faqat test rejimida (ALLOW_MOCK_DEPOSIT=1)")
    try:
        return await deposit_wallet(user.id, body.amount, body.note or "")
    except WalletError as err:
        raise HTTPException(err.status, err.message)


@router.post("/allocate")
async def allocate(body: AllocateBody, user: Annotated[AuthUser, Depends(require_business)]):
    try:
        result = await allocate_to_campaign(user.id, body.campaign_id, body.amount)
        await reload_campaign_cache_bg()
        return result
    except WalletError as err:
        raise HTTPException(err.status, err.message, headers={"X-Error-Code": err.code} if err.code else None)


@router.post("/deallocate")
async def deallocate(body: DeallocateBody, user: Annotated[AuthUser, Depends(require_business)]):
    try:
        result = await deallocate_from_campaign(user.id, body.campaign_id, body.amount)
        await reload_campaign_cache_bg()
        return result
    except WalletError as err:
        raise HTTPException(err.status, err.message)
