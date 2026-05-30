from datetime import datetime, timezone

from app.core.bson_utils import oid
from app.db.mongo import get_db


def campaign_budget_remaining(campaign: dict) -> float:
    budget = max(0, float(campaign.get("budget") or 0))
    spent = max(0, float(campaign.get("spent") or 0))
    if budget <= 0:
        return float("inf")
    return max(0, budget - spent)


def has_campaign_budget_remaining(campaign: dict) -> bool:
    budget = float(campaign.get("budget") or 0)
    if budget <= 0:
        return True
    return campaign_budget_remaining(campaign) > 0


async def _log_tx(user_id, tx_type, amount, balance_after, campaign_id=None, note=""):
    db = get_db()
    doc = {
        "user_id": oid(user_id),
        "type": tx_type,
        "amount": amount,
        "campaign_id": oid(campaign_id) if campaign_id else None,
        "balance_after": balance_after,
        "note": note,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }
    await db.wallettransactions.insert_one(doc)


class WalletError(Exception):
    def __init__(self, message: str, status: int = 400, code: str | None = None):
        super().__init__(message)
        self.status = status
        self.code = code


async def get_wallet_summary(user_id: str) -> dict:
    db = get_db()
    uid = oid(user_id)
    user = await db.users.find_one({"_id": uid}, {"wallet_balance": 1, "role": 1})
    if not user:
        raise WalletError("Foydalanuvchi topilmadi", 404)

    campaigns = await db.campaigns.find({"owner_id": uid}, {"name": 1, "budget": 1, "spent": 1, "active": 1}).to_list(500)
    allocated = sum(max(0, float(c.get("budget") or 0)) for c in campaigns)
    spent_total = sum(max(0, float(c.get("spent") or 0)) for c in campaigns)
    wallet_balance = max(0, float(user.get("wallet_balance") or 0))
    alloc_remaining = sum(
        r for r in (campaign_budget_remaining(c) for c in campaigns) if r != float("inf")
    )

    return {
        "wallet_balance": wallet_balance,
        "allocated_total": allocated,
        "spent_total": spent_total,
        "allocated_remaining": alloc_remaining,
        "total_available": wallet_balance + alloc_remaining,
        "campaigns": [
            {
                "id": str(c["_id"]),
                "name": c["name"],
                "budget": c.get("budget") or 0,
                "spent": c.get("spent") or 0,
                "remaining": None if campaign_budget_remaining(c) == float("inf") else campaign_budget_remaining(c),
                "active": c.get("active"),
            }
            for c in campaigns
        ],
    }


async def deposit_wallet(user_id: str, amount: float, note: str = "") -> dict:
    amt = round(float(amount))
    if amt <= 0:
        raise WalletError("Summa musbat bo‘lishi kerak")
    db = get_db()
    user = await db.users.find_one({"_id": oid(user_id)})
    if not user:
        raise WalletError("Foydalanuvchi topilmadi", 404)
    if user.get("role") != "business":
        raise WalletError("Faqat biznes hamyoniga to‘ldirish mumkin", 403)
    new_bal = max(0, float(user.get("wallet_balance") or 0) + amt)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"wallet_balance": new_bal}})
    await _log_tx(user_id, "deposit", amt, new_bal, note=note or "Balans to‘ldirildi")
    return await get_wallet_summary(user_id)


async def allocate_to_campaign(user_id: str, campaign_id: str, amount: float) -> dict:
    amt = round(float(amount))
    if amt <= 0:
        raise WalletError("Summa musbat bo‘lishi kerak")
    db = get_db()
    user = await db.users.find_one({"_id": oid(user_id)})
    if not user:
        raise WalletError("Foydalanuvchi topilmadi", 404)
    if float(user.get("wallet_balance") or 0) < amt:
        raise WalletError("Hamyonda yetarli mablag‘ yo‘q", 400, "INSUFFICIENT_FUNDS")

    campaign = await db.campaigns.find_one({"_id": oid(campaign_id), "owner_id": oid(user_id)})
    if not campaign:
        raise WalletError("Kampaniya topilmadi", 404)

    new_bal = float(user.get("wallet_balance") or 0) - amt
    new_budget = float(campaign.get("budget") or 0) + amt
    active = campaign.get("active")
    if active == 0 and campaign_budget_remaining({**campaign, "budget": new_budget}) > 0:
        active = 1

    await db.users.update_one({"_id": user["_id"]}, {"$set": {"wallet_balance": new_bal}})
    await db.campaigns.update_one({"_id": campaign["_id"]}, {"$set": {"budget": new_budget, "active": active}})
    await _log_tx(user_id, "allocate", amt, new_bal, campaign_id, f"{campaign['name']} ga ajratildi")
    return {
        "wallet": await get_wallet_summary(user_id),
        "campaign": {"id": str(campaign["_id"]), "budget": new_budget, "spent": campaign.get("spent") or 0},
    }


async def deallocate_from_campaign(user_id: str, campaign_id: str, amount: float | None = None) -> dict:
    db = get_db()
    campaign = await db.campaigns.find_one({"_id": oid(campaign_id), "owner_id": oid(user_id)})
    if not campaign:
        raise WalletError("Kampaniya topilmadi", 404)

    remaining = campaign_budget_remaining(campaign)
    if remaining == float("inf") or remaining <= 0:
        raise WalletError("Qaytarish uchun bo‘sh byudjet yo‘q")

    amt = remaining if amount is None else min(round(float(amount)), remaining)
    if amt <= 0:
        raise WalletError("Noto‘g‘ri summa")

    user = await db.users.find_one({"_id": oid(user_id)})
    new_budget = max(float(campaign.get("spent") or 0), float(campaign.get("budget") or 0) - amt)
    new_bal = float(user.get("wallet_balance") or 0) + amt
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"wallet_balance": new_bal}})
    await db.campaigns.update_one({"_id": campaign["_id"]}, {"$set": {"budget": new_budget}})
    await _log_tx(user_id, "deallocate", amt, new_bal, campaign_id, f"{campaign['name']} dan qaytarildi")
    return {
        "wallet": await get_wallet_summary(user_id),
        "campaign": {"id": str(campaign["_id"]), "budget": new_budget, "spent": campaign.get("spent") or 0},
    }


async def allocate_on_campaign_create(user_id: str, campaign_id: str, campaign_name: str, budget_amount: float) -> None:
    amt = round(float(budget_amount) or 0)
    if amt <= 0:
        return
    db = get_db()
    user = await db.users.find_one({"_id": oid(user_id)})
    if float(user.get("wallet_balance") or 0) < amt:
        raise WalletError("Hamyonda yetarli mablag‘ yo‘q — avval balans to‘ldiring", 400, "INSUFFICIENT_FUNDS")
    new_bal = float(user.get("wallet_balance") or 0) - amt
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"wallet_balance": new_bal}})
    await db.campaigns.update_one({"_id": oid(campaign_id)}, {"$set": {"budget": amt}})
    await _log_tx(user_id, "allocate", amt, new_bal, campaign_id, f"Yangi kampaniya: {campaign_name}")


async def pause_campaign_if_budget_exhausted(campaign_id: str) -> None:
    db = get_db()
    campaign = await db.campaigns.find_one({"_id": oid(campaign_id)}, {"budget": 1, "spent": 1, "active": 1})
    if not campaign:
        return
    budget = float(campaign.get("budget") or 0)
    if budget <= 0:
        return
    if float(campaign.get("spent") or 0) >= budget:
        await db.campaigns.update_one({"_id": campaign["_id"]}, {"$set": {"active": 0}})


async def get_wallet_transactions(user_id: str, limit: int = 30) -> list[dict]:
    db = get_db()
    cursor = db.wallettransactions.find({"user_id": oid(user_id)}).sort("createdAt", -1).limit(limit)
    rows = []
    async for r in cursor:
        rows.append(
            {
                "id": str(r["_id"]),
                "type": r["type"],
                "amount": r["amount"],
                "balance_after": r.get("balance_after"),
                "campaign_id": str(r["campaign_id"]) if r.get("campaign_id") else None,
                "note": r.get("note", ""),
                "created_at": r.get("createdAt"),
            }
        )
    return rows
