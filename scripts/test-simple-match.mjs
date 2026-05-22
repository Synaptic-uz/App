import { findBestCampaign } from '../campaignMatcher.js';
import { isCampaignServeReady } from '../suggestion.js';

const campaigns = [
  {
    _id: '1',
    name: 'Uzum Market',
    category: 'electronics',
    subcategory: 'general',
    brand_url: 'https://uzum.market',
    link_text: 'Uzum Market',
    tracking_code: 'uzum-electronics-001',
    tagline: 'Marketplace',
    keywords: ['noutbuk', 'telefon', 'iphone', 'laptop'],
    niche_keywords: [],
    active: 1,
  },
  {
    _id: '2',
    name: 'Yandex Eats',
    category: 'food',
    subcategory: 'delivery',
    brand_url: 'https://eda.yandex.uz',
    link_text: 'Yandex Eats',
    tracking_code: 'yandex-food-004',
    tagline: 'Delivery',
    keywords: ['pizza', 'ovqat', 'delivery'],
    niche_keywords: [],
    active: 1,
  },
];

const prompts = [
  'iPhone 15 narxlari qancha?',
  'Noutbuk sotib olmoqchiman',
  'Pizza buyurtma qilmoqchiman',
];

for (const prompt of prompts) {
  const r = await findBestCampaign(prompt, campaigns, { recordServe: false });
  const ok = r.campaign && isCampaignServeReady(r.campaign);
  console.log(prompt.slice(0, 40), '→', ok ? r.campaign.name : 'NO MATCH', `(${r.method})`);
}
