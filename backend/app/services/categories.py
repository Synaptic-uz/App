"""Category taxonomy for prompt intent detection (mirrors categories.js)."""

OTHER_CATEGORY_ID = "other"

TAXONOMY: dict = {
    "shopping_retail": {
        "label": "Xarid va chakana savdo",
        "subcategories": {
            "electronics": {
                "label": "Elektronika va texnika",
                "signals": [
                    "noutbuk", "laptop", "telefon", "phone", "iphone", "samsung", "smartphone",
                    "planshet", "tablet", "kompyuter", "elektronika", "texnika", "gadjet", "narxi",
                    "gaming pc", "gaming noutbuk", "gaming laptop", "gaming", "gamer", "rtx", "gpu",
                    "playstation", "ps5", "xbox", "steam", "oyin", "o'yin", "klaviatura", "naushnik",
                    "televizor", "tv", "muzlatgich", "kir yuvish", "konditsioner", "mikroto'lqin",
                    "microwave", "maishiy texnika",
                ],
            },
            "fashion": {
                "label": "Moda va kiyim-kechak",
                "signals": [
                    "kiyim", "moda", "fashion", "dress", "style", "kechak",
                    "oyoq kiyim", "krossovka", "sneaker", "poyabzal", "shoes",
                    "sumka", "bag", "aksessuar", "soat", "watch", "zargarlik",
                ],
            },
            "beauty": {
                "label": "Go'zallik va shaxsiy parvarish",
                "signals": [
                    "kosmetika", "parfyum", "perfume", "skincare", "soch", "hair", "beauty", "go'zallik",
                    "dorixona", "pharmacy", "dori", "vitamin", "apteka", "health",
                ],
            },
            "home": {
                "label": "Uy va mebel",
                "signals": [
                    "mebel", "furniture", "divan", "stol", "interior", "uy jihozlari",
                    "remont", "qurilish", "bo'yoq", "plitka", "diy", "construction",
                ],
            },
            "kids": {
                "label": "Bolalar va chaqaloq",
                "signals": ["bolalar", "kids", "o'yinchoq", "toy", "chaqaloq", "baby", "maktab"],
            },
            "sports": {
                "label": "Sport va fitnes",
                "signals": ["sport", "fitness", "zal", "gym", "to'p", "futbol", "trekking"],
            },
            "marketplace": {
                "label": "Marketpleys va chakana",
                "signals": ["marketplace", "internet do'kon", "onlayn do'kon", "xarid", "buyurtma", "sotib ol"],
            },
        },
    },
    "food_lifestyle": {
        "label": "Ovqat va turmush tarzi",
        "subcategories": {
            "delivery": {
                "label": "Ovqat yetkazib berish",
                "signals": ["yetkazib", "delivery", "ovqat", "pizza", "sushi", "taom", "restaurant", "buyurtma"],
            },
            "groceries": {
                "label": "Oziq-ovqat va supermarket",
                "signals": ["supermarket", "groceries", "mahsulot", "oziq ovqat", "non", "sut", "go'sht"],
            },
            "coffee": {
                "label": "Qahva va kafe",
                "signals": ["qahva", "kofe", "coffee", "espresso", "cappuccino", "latte", "cafe"],
            },
            "pets": {
                "label": "Uy hayvonlari",
                "signals": ["hayvon", "pet", "mushuk", "it", "dog", "cat", "oziq hayvon"],
            },
        },
    },
    "finance_services": {
        "label": "Moliya va xizmatlar",
        "subcategories": {
            "installment": {
                "label": "Muddatli to'lov",
                "signals": ["muddatli tolov", "kredit", "bo'lib to'lash", "installment", "0%"],
            },
            "banking": {
                "label": "Bank va kartalar",
                "signals": ["bank", "karta", "card", "pul o'tkazma", "deposit", "loan"],
            },
            "insurance": {
                "label": "Sug'urta",
                "signals": ["sug'urta", "insurance", "policy", "kasko"],
            },
            "general_services": {
                "label": "B2B va iste'mol xizmatlari",
                "signals": ["xizmat", "service", "consulting", "agency", "subscription", "saas"],
            },
            "cloud": {
                "label": "Bulut va dasturchi vositalari",
                "signals": ["cloud", "hosting", "server", "developer", "api", "coding"],
            },
        },
    },
    "travel_transport": {
        "label": "Sayohat va transport",
        "subcategories": {
            "trips_hotels": {
                "label": "Sayohat va mehmonxonalar",
                "signals": ["sayohat", "turizm", "ta'til", "travel", "mehmonxona", "hotel", "chipta", "vacation"],
            },
            "flights": {
                "label": "Parvozlar va chiptalar",
                "signals": ["flight", "samolyot", "avia", "bilet", "airport"],
            },
            "taxi": {
                "label": "Taksi va mashina chaqirish",
                "signals": ["taxi", "yandex go", "mashina chaqirish", "ride"],
            },
            "auto": {
                "label": "Avtomobillar va ehtiyot qismlar",
                "signals": ["mashina", "avto", "car", "avtomobil", "zapchast", "auto", "haydovchi"],
            },
        },
    },
    "education_media": {
        "label": "Ta'lim va media",
        "subcategories": {
            "university": {
                "label": "Universitetlar va qabul",
                "signals": [
                    "universitet", "university", "abituriyent", "magistratura", "bakalavr",
                    "college", "o'qish", "oqish", "talim", "ta'lim", "fakultet", "grant",
                    "stipendiya", "qabul", "admission", "campus",
                ],
            },
            "courses": {
                "label": "Kurslar va repetitorlik",
                "signals": ["kurs", "course", "learn", "tutor", "online course", "training"],
            },
            "books": {
                "label": "Kitoblar va kanselyariya",
                "signals": ["kitob", "book", "daftar", "stationery", "qalam"],
            },
            "streaming": {
                "label": "Striming va obunalar",
                "signals": ["streaming", "film", "movie", "music", "subscription", "video"],
            },
            "events": {
                "label": "Tadbirlar va chiptalar",
                "signals": ["bilet", "ticket", "konsert", "concert", "teatr", "event"],
            },
        },
    },
    "real_estate": {
        "label": "Ko'chmas mulk",
        "subcategories": {
            "rent": {
                "label": "Ijara",
                "signals": ["ijara", "rent", "kvartira", "apartment", "uy ijarasi"],
            },
            "buy": {
                "label": "Mulk sotib olish",
                "signals": ["sotiladi", "uy sotib", "real estate", "property", "dom"],
            },
        },
    },
}


def is_other_category(category: str | None) -> bool:
    return category == OTHER_CATEGORY_ID


def _count_signal_hits(lower: str, signals: list[str]) -> tuple[int, list[str]]:
    hits = 0
    matched = []
    for s in signals or []:
        sig = s.lower().strip()
        if len(sig) >= 3 and sig in lower:
            hits += 1
            matched.append(sig)
    return hits, matched


def detect_prompt_intent(prompt: str) -> dict:
    lower = prompt.lower()
    best = {"category": None, "subcategory": None, "score": 0, "matched": []}

    for category, cat_def in TAXONOMY.items():
        for subcategory, sub_def in cat_def["subcategories"].items():
            hits, matched = _count_signal_hits(lower, sub_def["signals"])
            if hits > best["score"]:
                best = {"category": category, "subcategory": subcategory, "score": hits, "matched": matched}

    if best["score"] == 0:
        return {"category": None, "subcategory": None, "score": 0, "matched": []}
    return best


def display_category(campaign: dict) -> str:
    if is_other_category(campaign.get("category")) and campaign.get("custom_category"):
        return campaign["custom_category"]
    cat = TAXONOMY.get(campaign.get("category") or "")
    return cat["label"] if cat else str(campaign.get("category") or "")


OTHER_SUBCATEGORY_ID = "custom"

CATEGORY_ALIASES = {
    "retail": "shopping_retail",
    "shopping": "shopping_retail",
    "food": "food_lifestyle",
    "education": "education_media",
    "finance": "finance_services",
    "tech": "shopping_retail",
    "technology": "shopping_retail",
    "health": "shopping_retail",
    "travel": "travel_transport",
    "services": "finance_services",
    "other": OTHER_CATEGORY_ID,
}


def default_subcategory(category: str) -> str:
    if is_other_category(category):
        return OTHER_SUBCATEGORY_ID
    cat = TAXONOMY.get(category)
    if not cat:
        return "general"
    keys = list(cat["subcategories"].keys())
    return "general" if "general" in keys else keys[0]


def get_category_options() -> list[dict]:
    options = []
    for cat_id, cat in TAXONOMY.items():
        options.append(
            {
                "id": cat_id,
                "label": cat["label"],
                "subcategories": [{"id": sid, "label": sub["label"]} for sid, sub in cat["subcategories"].items()],
            }
        )
    options.append(
        {
            "id": OTHER_CATEGORY_ID,
            "label": "Boshqa — yuqorida yo‘q",
            "subcategories": [{"id": OTHER_SUBCATEGORY_ID, "label": "Maxsus (biznesingizni yozing)"}],
            "allowCustomLabel": True,
        }
    )
    return options


def get_category_taxonomy_for_prompt() -> list[dict]:
    return [{"id": c["id"], "label": c["label"], "subcategories": [s["id"] for s in c["subcategories"]]} for c in get_category_options() if c["id"] != OTHER_CATEGORY_ID]


def resolve_category_from_research(raw_category: str, raw_subcategory: str) -> tuple[str, str]:
    category = str(raw_category or "").strip().lower()
    if CATEGORY_ALIASES.get(category):
        category = CATEGORY_ALIASES[category]
    if category not in TAXONOMY:
        category = OTHER_CATEGORY_ID

    subcategory = str(raw_subcategory or "").strip().lower()
    cat_def = TAXONOMY.get(category)
    if cat_def and subcategory and subcategory not in cat_def["subcategories"]:
        keys = list(cat_def["subcategories"].keys())
        fuzzy = next((k for k in keys if subcategory in k or k in subcategory), None)
        subcategory = fuzzy or default_subcategory(category)
    if not subcategory:
        subcategory = default_subcategory(category)
    return category, subcategory


def build_campaign_profile_text(campaign: dict) -> str:
    cat_def = TAXONOMY.get(campaign.get("category") or "")
    if is_other_category(campaign.get("category")):
        cat_label = campaign.get("custom_category") or campaign.get("category")
    else:
        cat_label = cat_def["label"] if cat_def else campaign.get("category")

    subcat_def = cat_def["subcategories"].get(campaign.get("subcategory") or "") if cat_def else None
    subcat_label = subcat_def["label"] if subcat_def else ("" if campaign.get("subcategory") == OTHER_SUBCATEGORY_ID else campaign.get("subcategory"))
    sub_signals = (subcat_def or {}).get("signals", [])[:15]

    offerings = campaign.get("offerings") or []
    offering_text = ""
    if offerings:
        parts = []
        for o in offerings:
            kind = "xizmat" if o.get("type") == "service" else "mahsulot"
            kw = f" ({', '.join(o.get('keywords') or [])})" if o.get("keywords") else ""
            price = f", {o['price_hint']}" if o.get("price_hint") else ""
            parts.append(f"{o.get('name')} [{kind}]{price}{kw}")
        offering_text = "; ".join(parts)

    # Building a rich semantic profile for high-quality vector matching
    chunks = [
        f"USAL: {campaign.get('name')}", # Unique Semantic Alias
        f"SOH: {cat_label} / {subcat_label}".strip(" / "), # Industry/Soha
        f"SHI: {campaign.get('tagline')}" if campaign.get("tagline") else "", # Tagline/Shior
        f"IZO: {campaign.get('description')}" if campaign.get("description") else "", # Description/Izoh
        f"MAV: {', '.join(campaign.get('keywords') or [])}" if campaign.get("keywords") else "", # Keywords/Mavzu
        f"NIK: {', '.join(campaign.get('niche_keywords') or [])}" if campaign.get("niche_keywords") else "", # Niche/Nik
        f"MAH: {offering_text}" if offering_text else "", # Products/Services
        f"OHN: {campaign.get('tone')}" if campaign.get("tone") else "", # Tone/Ohang
        f"INT: {', '.join(sub_signals)}" if sub_signals else "", # Intent Signals
        "LOK: O'zbekiston bozori, Toshkent, hududiy kontekst", # Location context
    ]
    
    # Add a human-readable synthesis for better cross-lingual embedding mapping
    synthesis = f"{campaign.get('name')} - {cat_label} sohasida faoliyat yuritadi. {campaign.get('tagline') or ''} {campaign.get('description') or ''}"
    chunks.append(f"SYN: {synthesis.strip()}")
    
    return " | ".join(c for c in chunks if c).strip()
