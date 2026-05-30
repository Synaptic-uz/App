import type { CategoryOption } from './categories';
import type { CampaignFormState } from './campaignFormDefaults';
import { offeringsFromResearch } from './campaignOfferings';

export type ResearchResult = {
  name?: string;
  tagline?: string;
  description?: string;
  keywords?: string[];
  niche_keywords?: string[];
  link_text?: string;
  category?: string;
  subcategory?: string;
  custom_category?: string;
  tone?: string;
  cpc_rate_suggestion?: number;
  budget_suggestion?: number;
  research_summary?: string;
  offerings?: unknown[];
};

export function applyResearchToForm(
  form: CampaignFormState,
  result: ResearchResult,
  categories: CategoryOption[]
): CampaignFormState {
  const cat = categories.find((c) => c.id === result.category);
  const sub =
    cat?.subcategories?.find((s) => s.id === result.subcategory)?.id ||
    cat?.subcategories?.[0]?.id ||
    form.subcategory;

  return {
    ...form,
    brand_url: form.brand_url,
    name: result.name || form.name,
    tagline: result.tagline || form.tagline,
    description: result.description || form.description,
    keywords: (result.keywords || []).length ? (result.keywords || []).join(', ') : form.keywords,
    niche_keywords: (result.niche_keywords || []).length
      ? (result.niche_keywords || []).join(', ')
      : form.niche_keywords,
    link_text: result.link_text || form.link_text || 'Batafsil',
    category: result.category || form.category,
    subcategory: sub,
    custom_category: result.category === 'other' ? result.custom_category || form.custom_category : '',
    tone: result.tone || form.tone,
    cpc_rate: String(result.cpc_rate_suggestion ?? form.cpc_rate ?? '2500'),
    budget: result.budget_suggestion ? String(result.budget_suggestion) : form.budget,
    offerings:
      Array.isArray(result.offerings) && result.offerings.length > 0
        ? offeringsFromResearch(result.offerings)
        : form.offerings,
  };
}

export function isCampaignActive(camp: { active?: number | boolean }) {
  return camp.active === 1 || camp.active === true;
}
