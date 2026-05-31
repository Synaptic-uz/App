from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.core.deps import AuthUser, require_business
from app.utils.response import AppResponse, AppException
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
        data = await get_wallet_summary(user.id)
        return AppResponse.success(data)
    except Exception as err:
        raise AppException("wallet.load_failed", http_status=500, message=str(err))


@router.get("/transactions")
async def transactions(user: Annotated[AuthUser, Depends(require_business)]):
    data = await get_wallet_transactions(user.id)
    return AppResponse.success({"transactions": data})


@router.post("/deposit")
async def deposit(body: DepositBody, user: Annotated[AuthUser, Depends(require_business)]):
    if not settings.allow_mock_deposit:
        raise AppException("wallet.deposit_test_mode_only", http_status=403)
    try:
        data = await deposit_wallet(user.id, body.amount, body.note or "")
        return AppResponse.success(data)
    except WalletError as err:
        raise AppException("wallet.deposit_failed", http_status=err.status, message=err.message)


@router.post("/allocate")
async def allocate(body: AllocateBody, user: Annotated[AuthUser, Depends(require_business)]):
    try:
        result = await allocate_to_campaign(user.id, body.campaign_id, body.amount)
        await reload_campaign_cache_bg()
        return AppResponse.success(result)
    except WalletError as err:
        raise AppException("wallet.allocate_failed", http_status=err.status, message=err.message)


@router.post("/deallocate")
async def deallocate(body: DeallocateBody, user: Annotated[AuthUser, Depends(require_business)]):
    try:
        result = await deallocate_from_campaign(user.id, body.campaign_id, body.amount)
        await reload_campaign_cache_bg()
        return AppResponse.success(result)
    except WalletError as err:
        raise AppException("wallet.deallocate_failed", http_status=err.status, message=err.message)
