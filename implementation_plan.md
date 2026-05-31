# Campaign Form + Design System To'liq Tuzatish

## Muammo

### 1. CampaignForm — Faqat 1 ta Field (name)
[CampaignForm.tsx](file:///home/dilyorbek/Desktop/Synaptic/dashboard/src/app/components/design/CampaignForm.tsx) hozir **faqat `name` inputni** ko'rsatadi va submit tugma bor. Lekin backend **15 ta field** kutadi:

| Field | Turi | Backend kutadi | Hozir formda |
|-------|------|:-:|:-:|
| `name` | text | ✅ | ✅ |
| `category` | select | ✅ | ❌ |
| `subcategory` | select | ✅ | ❌ |
| `custom_category` | text | ✅ | ❌ |
| `brand_url` | url | ✅ | ❌ |
| `link_text` | text | ✅ | ❌ |
| `tagline` | text | ✅ | ❌ |
| `description` | textarea | ✅ | ❌ |
| `keywords` | text | ✅ | ❌ |
| `niche_keywords` | text | ✅ | ❌ |
| `budget` | number | ✅ | ❌ |
| `cpc_rate` | number | ✅ | ❌ |
| `tone` | select | ✅ | ❌ |
| `research_brief` | textarea | ✅ | ❌ |
| `offerings[]` | array | ✅ | ❌ |

Bundan tashqari:
- **AI Research tugma** — `runAiResearch` funksiyasi yozilgan, lekin UI da tugma yo'q
- **CampaignOfferingsEditor** — import qilingan, lekin render qilinmagan
- **CampaignProfilePanel** — import qilingan, lekin render qilinmagan

### 2. Design System Stub Komponentlar
`design/index.tsx` da barcha komponentlar placeholder:
- `FormField` — label styling yo'q, `hint` prop yo'q
- `inputClassName` — faqat `"w-full border p-2"`
- `selectClassName` va `textareaClassName` — **umuman export qilinmagan** (CampaignOfferingsEditor ularni import qiladi!)
- `AppButton` — `variant`, `size` proplarni qo'llab-quvvatlamaydi
- `Badge` — variant yo'q
- `Logo`, `AuthLayout`, `AuthCard` — minimal

### 3. `applyResearchToForm` funksiya signature noto'g'ri chaqirilgan
CampaignForm.tsx'da:
```tsx
applyResearchToForm(res, setForm); // 2 argument
```
Lekin campaignFormUtils.ts'da funksiya **3 argument** kutadi:
```tsx
function applyResearchToForm(form, result, categories): CampaignFormState
```
Va u `setForm` emas, `CampaignFormState` qaytaradi.

---

## Proposed Changes

### Component 1: Design System — [design/index.tsx](file:///home/dilyorbek/Desktop/Synaptic/dashboard/src/app/components/design/index.tsx)

#### [MODIFY] index.tsx

Quyidagi komponentlarni **to'liq professional** qilib qayta yozish:

**FormField** — label, hint, required indicator bilan:
```tsx
export function FormField({ label, hint, children, required }: {
  label: string; hint?: string; children: ReactNode; required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-[var(--color-text)]">
        {label} {required && <span className="text-[var(--color-danger)]">*</span>}
      </label>
      {hint && <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>}
      {children}
    </div>
  );
}
```

**Input/Select/Textarea classNames** — professional styling:
```tsx
export const inputClassName = "w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 text-sm ...";
export const selectClassName = "..."; // + appearance-none
export const textareaClassName = "..."; // + resize-vertical
```

**Badge** — variant support (success, danger, primary, neutral):
**AppButton** — variant (primary, secondary, ghost), size (sm, md, lg)
**Logo** — size boshqaruvi (sm=28px, md=36px, lg=48px)
**AuthLayout, AuthCard** — centered, gradient background, glass card
**BackLink** — default icon va "/" havola
**IconButton** — hover states, aria-label
**DataCard** — subtitle, meta, badges proplarni render qilish

---

### Component 2: CampaignForm — [CampaignForm.tsx](file:///home/dilyorbek/Desktop/Synaptic/dashboard/src/app/components/design/CampaignForm.tsx)

#### [MODIFY] CampaignForm.tsx

To'liq formni qayta yozish — barcha 15 fieldni ko'rsatish:

**Forma tuzilmasi (yuqoridan pastga):**

1. **🔗 Brand URL + AI Research tugma** — `brand_url` input + `✨ AI bilan to'ldirish` tugma
2. **📝 Asosiy ma'lumotlar** — `name`, `tagline`, `description`  
3. **📂 Kategoriya** — `category` select → `subcategory` select (dinamik) → `custom_category` (agar "other")
4. **🎯 Kalit so'zlar** — `keywords`, `niche_keywords`
5. **💰 Byudjet va CPC** — `budget`, `cpc_rate`, `tone` select
6. **🔗 Havola** — `link_text`
7. **📦 Mahsulotlar** — `<CampaignOfferingsEditor />`
8. **🤖 AI Profil Preview** — `<CampaignProfilePanel />`
9. **💾 Submit tugma**

**AI Research flow:**
```
brand_url kiritish → "✨ AI bilan to'ldirish" tugmasi → 
API: /campaigns/research → natijani formga apply qilish
```

---

### Component 3: `applyResearchToForm` — Moslashtirish

#### [MODIFY] [campaignFormUtils.ts](file:///home/dilyorbek/Desktop/Synaptic/dashboard/src/lib/campaignFormUtils.ts)

`applyResearchToForm` chaqiruvini to'g'rilash — CampaignForm dan `setForm((prev) => applyResearchToForm(prev, result, categories))` shaklida chaqirish.

---

## AI Training bo'yicha

> [!NOTE]
> Bu formda backend `/campaigns/research` API orqali **AI avtomatik to'ldirish** ishlaydi:
> 1. Foydalanuvchi `brand_url` (masalan `https://uzum.uz`) kiritadi
> 2. "AI bilan to'ldirish" tugmasini bosadi
> 3. Backend saytni scan qiladi va `name`, `tagline`, `description`, `keywords`, `offerings[]` ni qaytaradi
> 4. Frontend formni avtomatik to'ldiradi
> 
> Bu "training" emas — **research/crawl** jarayoni. Ammo embedding yaratish uchun `CampaignProfilePanel` real-time preview beradi.

---

## Verification Plan

### Automated Tests
```bash
npx vite build   # Build muvaffaqiyatli o'tishi kerak
```

### Manual Verification
1. `/business/campaigns` sahifasiga kirish
2. "Yangi kampaniya" tugmasini bosish
3. Forma **barcha 15 field**ni ko'rsatishi tekshirish
4. `brand_url` kiritib "AI bilan to'ldirish" tugmasini bosish
5. Kategoriya tanlaganda subcategory dinamik o'zgarishini tekshirish
6. Mahsulot qo'shish/o'chirish ishlashini tekshirish
7. Profile Preview panelni ko'rish

## TODO
- [ ] VectorDB (Qdrant) ni live `http://localhost:6333` bilan to'liq production yo'lga qo'yish, embedding sync va search loglarini tekshirish
