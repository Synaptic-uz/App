from app.services.categories import display_category


def is_campaign_serve_ready(campaign: dict) -> bool:
    if not campaign:
        return False
    if not str(campaign.get("name") or "").strip():
        return False
    if not str(campaign.get("category") or "").strip():
        return False
    if not str(campaign.get("tracking_code") or "").strip():
        return False
    url = str(campaign.get("brand_url") or "").strip()
    if not url or not url.lower().startswith(("http://", "https://")):
        return False
    budget = float(campaign.get("budget") or 0)
    if budget > 0 and float(campaign.get("spent") or 0) >= budget:
        return False
    return True


def build_suggestion(campaign: dict) -> str:
    category = display_category(campaign) or "this topic"
    name = campaign.get("name") or "this brand"
    tagline = campaign.get("tagline") or "they have some great offers"
    return f"Oh, if you're interested in {category}, you might wanna check out {name} — {tagline}."


def build_cta_label(campaign: dict) -> str:
    return campaign.get("link_text") or campaign.get("name") or "View offer"


def format_sponsored_append(suggestion: str, cta_label: str) -> str:
    label = f" → {cta_label}" if cta_label else ""
    return f"\n\n\n[SPONSORED]: {suggestion}{label}"


def build_tracking_url(base_url: str, tracking_code: str, agent_username: str | None) -> str | None:
    if not tracking_code:
        return None
    base = base_url.rstrip("/")
    q = f"?a={agent_username}" if agent_username else ""
    return f"{base}/t/{tracking_code}{q}"


def build_display_path(tracking_code: str) -> str | None:
    return f"/t/{tracking_code}" if tracking_code else None
