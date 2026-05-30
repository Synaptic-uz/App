# AI va embedding sifatini oshirish

## Muhit

- `GITHUB_TOKEN` — LLM va embedding uchun majburiy
- `EMBEDDING_MODEL` — default `text-embedding-3-small`
- `AGENT_REVENUE_SHARE` — agent daromadi ulushi (default 0.7)

## Embedding

1. **Kampaniya yaratishdan keyin** — `POST /api/campaigns/:id/refresh-embedding` ni chaqiring
2. **Boy profil matni** — `buildCampaignProfileText` kategoriya, kalit so‘zlar va mavzu signallarini birlashtiradi
3. **Batch** — `embedTextBatch()` bir nechta kampaniyani bir so‘rovda embed qiladi
4. **Kesh** — to‘liq matn SHA-256 bo‘yicha keshlanadi (qisqa prefix emas)

## Matching

1. **Suhbat konteksti** — `messages` massivi `buildMatchingPrompt` orqali embedding va keyword matchga uzatiladi
2. **Keyword + vector** — kuchli vector moslikda og‘irlik 0.38 gacha oshadi
3. **AI tadqiqot** — yangi kampaniyalar uchun `POST /api/campaigns/research` dan foydalaning

## LLM (enrich)

1. **Chat history** — `POST /api/enrich` da `messages: [{ role, content }]`
2. **Markdown** — `parse_mode: "Markdown"` (default)
3. **Session** — `session_id` analitika va izchillik uchun

## Demo chat

- Butun tarix `enrich` va `send_result` ga yuboriladi
- Bot javoblari Markdown sifatida render qilinadi

## Keyingi qadamlar (ixtiyoriy)

- Kampaniya uchun alohida `text-embedding-3-large` sinovi
- Reranker (cross-encoder) top-5 nomzodlar uchun
- A/B test: keyword vs hybrid og‘irliklari
- O‘zbek/Rus query expansion (sinonimlar) kampaniya profiliga
