import json
import logging
import re

import httpx
from openai import AsyncOpenAI

from app.config import settings
from app.services.categories import get_category_taxonomy_for_prompt, resolve_category_from_research

logger = logging.getLogger(__name__)
MODEL = "openai/gpt-4o-mini"


def _client() -> AsyncOpenAI | None:
    if not settings.github_token:
        return None
    return AsyncOpenAI(base_url="https://models.github.ai/inference", api_key=settings.github_token)


async def research_campaign(*, brand_url: str, name: str = "", category: str = "", brief: str = "") -> dict:
    ai = _client()
    if not ai:
        return {"error": "GITHUB_TOKEN sozlanmagan — AI tadqiqot mavjud emas"}

    page_hint = ""
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            res = await client.get(brand_url, headers={"User-Agent": "SynapticBot/1.0 (+https://synaptic.uz)"})
            if res.status_code == 200:
                html = res.text
                title = re.search(r"<title[^>]*>([^<]+)</title>", html, re.I)
                desc = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']', html, re.I)
                snippet = re.sub(r"<script[\s\S]*?</script>", "", html, flags=re.I)
                snippet = re.sub(r"<[^>]+>", " ", snippet)
                snippet = re.sub(r"\s+", " ", snippet).strip()[:3500]
                parts = []
                if title:
                    parts.append(f"Title: {title.group(1).strip()}")
                if desc:
                    parts.append(f"Description: {desc.group(1).strip()}")
                if snippet:
                    parts.append(f"Content: {snippet}")
                page_hint = "\n".join(parts)
    except Exception:
        page_hint = "(Sayt kontenti avtomatik o‘qilmadi — URL va qisqa izoh asosida tahlil qilinadi)"

    taxonomy = json.dumps(get_category_taxonomy_for_prompt(), ensure_ascii=False)
    system = f"""You are a digital marketing strategist for Uzbekistan.
Output ONLY valid JSON with keys: name, tagline, description, keywords, niche_keywords, link_text,
suggested_category, suggested_subcategory, custom_category, tone, cpc_rate_suggestion, budget_suggestion,
offerings (array of {{name,type,description,url,price_hint,keywords}}), research_summary.
TAXONOMY: {taxonomy}"""

    user = f"Brand URL: {brand_url}\nKnown name: {name}\nCategory hint: {category}\nBrief: {brief}\nPage:\n{page_hint}"

    try:
        resp = await ai.chat.completions.create(
            model=MODEL,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.35,
            max_tokens=2400,
        )
        raw = resp.choices[0].message.content or ""
        m = re.search(r"\{[\s\S]*\}", raw)
        if not m:
            raise ValueError("AI JSON qaytarmadi")
        parsed = json.loads(m.group(0))
        cat_id, sub_id = resolve_category_from_research(parsed.get("suggested_category"), parsed.get("suggested_subcategory"))
        return {
            "name": str(parsed.get("name") or name or "")[:120],
            "tagline": str(parsed.get("tagline") or "")[:200],
            "description": str(parsed.get("description") or "")[:2000],
            "keywords": (parsed.get("keywords") or [])[:40],
            "niche_keywords": (parsed.get("niche_keywords") or [])[:20],
            "link_text": str(parsed.get("link_text") or "Batafsil")[:40],
            "category": cat_id,
            "subcategory": sub_id,
            "custom_category": str(parsed.get("custom_category") or "")[:80],
            "tone": parsed.get("tone") or "informative",
            "cpc_rate_suggestion": int(parsed.get("cpc_rate_suggestion") or 2000),
            "budget_suggestion": int(parsed.get("budget_suggestion") or 5_000_000),
            "offerings": parsed.get("offerings") or [],
            "research_summary": str(parsed.get("research_summary") or ""),
        }
    except Exception as err:
        logger.exception("Campaign research failed")
        return {"error": str(err)}
