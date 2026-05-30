import type { CampaignOffering } from './campaignOfferings';

export type CampaignFormState = {
  name: string;
  category: string;
  subcategory: string;
  custom_category: string;
  brand_url: string;
  link_text: string;
  tagline: string;
  description: string;
  keywords: string;
  niche_keywords: string;
  budget: string;
  cpc_rate: string;
  tone: string;
  research_brief: string;
  offerings: CampaignOffering[];
};

export const emptyCampaignForm: CampaignFormState = {
  name: '',
  category: '',
  subcategory: '',
  custom_category: '',
  brand_url: '',
  link_text: '',
  tagline: '',
  description: '',
  keywords: '',
  niche_keywords: '',
  budget: '',
  cpc_rate: '2500',
  tone: 'informative',
  research_brief: '',
  offerings: [],
};
