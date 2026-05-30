def normalize_offerings(raw) -> list[dict]:
    if not isinstance(raw, list):
        return []
    out = []
    for o in raw:
        kws = o.get("keywords") or []
        if isinstance(kws, str):
            kws = [s.strip() for s in kws.split(",") if s.strip()]
        else:
            kws = [str(s).strip() for s in kws if str(s).strip()]
        name = str(o.get("name") or "").strip()[:120]
        if not name:
            continue
        out.append(
            {
                "name": name,
                "type": "service" if o.get("type") == "service" else "product",
                "description": str(o.get("description") or "").strip()[:500],
                "url": str(o.get("url") or "").strip()[:500],
                "price_hint": str(o.get("price_hint") or "").strip()[:80],
                "keywords": kws[:12],
            }
        )
    return out[:30]


def merge_keywords_from_offerings(campaign_keywords: list | None, offerings: list | None) -> list[str]:
    base = list(campaign_keywords or [])
    seen = {k.lower() for k in base}
    for o in offerings or []:
        for kw in [o.get("name"), *(o.get("keywords") or [])]:
            t = str(kw or "").strip()
            if len(t) < 2:
                continue
            key = t.lower()
            if key not in seen:
                seen.add(key)
                base.append(t)
    return base[:40]
