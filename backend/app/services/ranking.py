import random
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from app.config import settings


@dataclass
class RankingConfig:
    weights: dict[str, float] = field(default_factory=dict)
    top_k: int = 5
    consecutive_cooldown: bool = True
    recent_window_size: int = 8
    max_same_campaign_in_window: int = 2
    max_same_owner_in_window: int = 4
    default_ctr: float = 0.05
    min_ctr: float = 0.01
    max_ctr: float = 0.25

    def __post_init__(self) -> None:
        if not self.weights:
            self.weights = {
                "bid": settings.ad_weight_bid,
                "relevance": settings.ad_weight_relevance,
                "ctr": settings.ad_weight_ctr,
                "randomness": settings.ad_weight_random,
            }
        self.top_k = settings.ad_top_k
        self.recent_window_size = settings.ad_recent_window
        self.max_same_campaign_in_window = settings.ad_max_same_in_window
        self.max_same_owner_in_window = settings.ad_max_owner_in_window


RANKING_CONFIG = RankingConfig()

_serving_state: dict[str, dict[str, Any]] = {}
_ctr_by_campaign: dict[str, float] = {}


def _state_key(context: Any) -> str:
    if not context:
        return "global"
    if isinstance(context, str):
        return context
    if isinstance(context, dict):
        if context.get("agentId"):
            return f"agent:{context['agentId']}"
        if context.get("sessionId"):
            return f"session:{context['sessionId']}"
    return "global"


def _get_serving_state(key: str) -> dict[str, Any]:
    if key not in _serving_state:
        _serving_state[key] = {
            "lastCampaignId": None,
            "recentCampaignIds": [],
            "recentOwnerIds": [],
        }
    return _serving_state[key]


def normalize_bid(cpc: float, min_cpc: float, max_cpc: float) -> float:
    if not cpc or cpc <= 0:
        return 0.0
    if max_cpc <= min_cpc:
        return 0.5
    return min(1.0, max(0.0, (cpc - min_cpc) / (max_cpc - min_cpc)))


def get_campaign_ctr(campaign_id: Any) -> float:
    cid = str(campaign_id)
    return _ctr_by_campaign.get(cid, RANKING_CONFIG.default_ctr)


def set_campaign_ctr(campaign_id: Any, impressions: int, clicks: int) -> None:
    cid = str(campaign_id)
    if not impressions or impressions < 1:
        _ctr_by_campaign[cid] = RANKING_CONFIG.default_ctr
        return
    raw = clicks / impressions
    _ctr_by_campaign[cid] = min(RANKING_CONFIG.max_ctr, max(RANKING_CONFIG.min_ctr, raw))


def sync_campaign_stats(campaigns: list[dict]) -> None:
    for c in campaigns or []:
        cid = c.get("_id")
        set_campaign_ctr(cid, c.get("stats_impressions") or 0, c.get("stats_clicks") or 0)


def bulk_load_ctr(stats: list[dict]) -> None:
    for row in stats or []:
        set_campaign_ctr(row.get("_id"), row.get("impressions") or 0, row.get("clicks") or 0)


def is_within_daily_cap(campaign: dict) -> bool:
    max_imp = campaign.get("max_daily_impressions", 1000)
    today = datetime.now().strftime("%a %b %d %Y")
    last = campaign.get("last_reset_date")
    last_str = last.strftime("%a %b %d %Y") if hasattr(last, "strftime") else today
    if last_str != today:
        return True
    return (campaign.get("today_impressions") or 0) < max_imp


def _count_in_recent(items: list, value: str, limit: int) -> int:
    n = 0
    start = max(0, len(items) - limit)
    for item in items[start:]:
        if item == value:
            n += 1
    return n


def apply_serving_constraints(candidates: list[dict], context: Any) -> list[dict]:
    key = _state_key(context)
    state = _get_serving_state(key)
    cfg = RANKING_CONFIG
    pool = [c for c in candidates if is_within_daily_cap(c["campaign"])]

    if not pool:
        return []

    if cfg.consecutive_cooldown and state["lastCampaignId"]:
        without_last = [c for c in pool if str(c["campaign"]["_id"]) != str(state["lastCampaignId"])]
        if without_last:
            pool = without_last

    window = cfg.recent_window_size
    penalized = []
    for c in pool:
        cid = str(c["campaign"]["_id"])
        owner_key = str(c["campaign"].get("owner_id") or cid)
        same_campaign = _count_in_recent(state["recentCampaignIds"], cid, window)
        same_owner = _count_in_recent(state["recentOwnerIds"], owner_key, window)

        penalty = 1.0
        if same_campaign >= cfg.max_same_campaign_in_window:
            penalty *= 0.15
        elif same_campaign > 0:
            penalty *= 0.55**same_campaign

        if same_owner >= cfg.max_same_owner_in_window:
            penalty *= 0.2
        elif same_owner > 1:
            penalty *= 0.75 ** (same_owner - 1)

        penalized.append({**c, "servingPenalty": penalty})

    viable = [c for c in penalized if (c.get("servingPenalty") or 1) > 0.05]
    return viable if viable else penalized


def compute_hybrid_score(candidate: dict, bid_norm: float, cfg: RankingConfig = RANKING_CONFIG) -> float:
    w = cfg.weights
    relevance = min(1.0, max(0.0, candidate.get("relevance") or 0))
    ctr = get_campaign_ctr(candidate["campaign"]["_id"])
    randomness = random.random()
    penalty = candidate.get("servingPenalty") or 1.0
    raw = w["bid"] * bid_norm + w["relevance"] * relevance + w["ctr"] * ctr + w["randomness"] * randomness
    return max(0.001, raw * penalty)


def select_top_k_weighted(scored: list[dict], k: int | None = None) -> dict | None:
    if not scored:
        return None
    k = k or RANKING_CONFIG.top_k
    sorted_scored = sorted(scored, key=lambda x: x["hybridScore"], reverse=True)
    top = sorted_scored[: min(k, len(sorted_scored))]
    total = sum(x["hybridScore"] for x in top)
    if total <= 0:
        return top[0]

    r = random.random() * total
    for item in top:
        r -= item["hybridScore"]
        if r <= 0:
            return item
    return top[-1]


def rank_and_select(candidates: list[dict], context: Any) -> dict:
    constrained = apply_serving_constraints(candidates, context)
    if not constrained:
        return {"selected": None, "candidates": [], "method": "no-viable-candidates"}

    cpcs = [c["campaign"].get("cpc_rate") or 0 for c in constrained]
    min_cpc, max_cpc = min(cpcs), max(cpcs)

    scored = []
    for c in constrained:
        bid_norm = normalize_bid(c["campaign"].get("cpc_rate") or 0, min_cpc, max_cpc)
        hybrid = compute_hybrid_score({**c, "relevance": c["relevance"]}, bid_norm)
        scored.append({**c, "bidNorm": bid_norm, "hybridScore": hybrid})

    picked = select_top_k_weighted(scored)
    return {"selected": picked, "candidates": scored, "method": "hybrid-topk"}


def record_click(campaign_id: Any) -> None:
    cid = str(campaign_id)
    imp = _ctr_by_campaign.get(f"{cid}:imp") or 0
    clk = (_ctr_by_campaign.get(f"{cid}:clk") or 0) + 1
    _ctr_by_campaign[f"{cid}:clk"] = clk
    set_campaign_ctr(campaign_id, imp, clk)


def clear_serving_state(context_key: str | None = None) -> None:
    if context_key:
        _serving_state.pop(context_key, None)
    else:
        _serving_state.clear()


def record_impression(context: Any, campaign: dict) -> None:
    if not campaign:
        return
    key = _state_key(context)
    state = _get_serving_state(key)
    cid = str(campaign["_id"])
    owner_key = str(campaign.get("owner_id") or cid)

    state["lastCampaignId"] = cid
    state["recentCampaignIds"].append(cid)
    state["recentOwnerIds"].append(owner_key)

    max_len = RANKING_CONFIG.recent_window_size * 2
    if len(state["recentCampaignIds"]) > max_len:
        state["recentCampaignIds"] = state["recentCampaignIds"][-max_len:]
        state["recentOwnerIds"] = state["recentOwnerIds"][-max_len:]

    prev_imp = _ctr_by_campaign.get(f"{cid}:imp") or 0
    prev_clk = _ctr_by_campaign.get(f"{cid}:clk") or 0
    _ctr_by_campaign[f"{cid}:imp"] = prev_imp + 1
    set_campaign_ctr(campaign["_id"], prev_imp + 1, prev_clk)
