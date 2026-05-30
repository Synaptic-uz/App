import ModelClient, { isUnexpected } from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';
import { getCategoryTaxonomyForPrompt, resolveCategoryFromResearch } from './categories.js';

const modelName = 'openai/gpt-4o-mini';
let client = null;

function getClient() {
  if (!client) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return null;
    client = ModelClient('https://models.github.ai/inference', new AzureKeyCredential(token));
  }
  return client;
}

/**
 * AI-powered campaign research — barcha forma maydonlarini to‘ldiradi.
 */
export async function researchCampaign({ brand_url, name, category, brief }) {
  const ai = getClient();
  if (!ai) {
    return { error: 'GITHUB_TOKEN sozlanmagan — AI tadqiqot mavjud emas' };
  }

  let pageHint = '';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(brand_url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SynapticBot/1.0 (+https://synaptic.uz)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (res.ok) {
      const html = await res.text();
      const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
      const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim();
      const snippet = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3500);
      pageHint = [title && `Title: ${title}`, desc && `Description: ${desc}`, snippet && `Content: ${snippet}`]
        .filter(Boolean)
        .join('\n');
    }
  } catch {
    pageHint = '(Sayt kontenti avtomatik o‘qilmadi — URL va qisqa izoh asosida tahlil qilinadi)';
  }

  const taxonomyJson = JSON.stringify(getCategoryTaxonomyForPrompt(), null, 0);

  const systemPrompt = `You are a digital marketing strategist for Uzbekistan (O'zbekistan).
Analyze the brand website and output ONLY valid JSON (no markdown fences) with ALL keys:

name (string, brand/campaign title in Uzbek or Russian),
tagline (string, short ad slogan),
description (string, 2-4 sentences for advertisers),
keywords (array of 10-18 phrases users type in AI chat when looking for this product — Uzbek/Russian mix),
niche_keywords (array of 4-8 long-tail phrases),
link_text (string, CTA button max 4 words, e.g. "Batafsil ko'rish"),
suggested_category (string, MUST be one category id from taxonomy below),
suggested_subcategory (string, MUST be valid subcategory id for that category),
custom_category (string, only if suggested_category is "other", else ""),
tone (one of: informative, promotional, comparative, deal-focused),
cpc_rate_suggestion (integer UZS per click, realistic 800-12000),
budget_suggestion (integer UZS total campaign budget, realistic 500000-50000000),
offerings (array of 3-12 items the business sells — each object):
  { name, type ("product" or "service"), description (1 sentence), url (product/deep link or empty),
    price_hint (e.g. "1.2 mln so'm" or ""), keywords (array 3-6 search phrases for that item) },
research_summary (2-3 sentences in Uzbek).

TAXONOMY (use exact ids):
${taxonomyJson}

Rules:
- Pick the closest category/subcategory from taxonomy
- keywords must match how Uzbeks ask AI assistants (prices, where to buy, delivery, installment)
- budget_suggestion should match business size implied by the site`;

  const userContent = `Brand URL: ${brand_url}
${name ? `Known name: ${name}` : ''}
${category ? `Category hint: ${category}` : ''}
${brief ? `Owner brief: ${brief}` : ''}

Page data:
${pageHint || 'No page scrape'}`;

  try {
    const response = await ai.path('/chat/completions').post({
      body: {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        model: modelName,
        temperature: 0.35,
        max_tokens: 2400,
      },
    });

    if (isUnexpected(response)) {
      throw new Error(response.body?.error?.message || 'AI javob bermadi');
    }

    const raw = response.body.choices[0]?.message?.content?.trim() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI JSON qaytarmadi');

    const parsed = JSON.parse(jsonMatch[0]);
    const { category: catId, subcategory: subId } = resolveCategoryFromResearch(
      parsed.suggested_category,
      parsed.suggested_subcategory
    );

    return {
      name: String(parsed.name || name || '').slice(0, 120),
      tagline: String(parsed.tagline || '').slice(0, 200),
      description: String(parsed.description || '').slice(0, 1000),
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String).slice(0, 20) : [],
      niche_keywords: Array.isArray(parsed.niche_keywords)
        ? parsed.niche_keywords.map(String).slice(0, 10)
        : [],
      link_text: String(parsed.link_text || 'Batafsil').slice(0, 40),
      category: catId,
      subcategory: subId,
      custom_category: catId === 'other' ? String(parsed.custom_category || '').slice(0, 80) : '',
      tone: ['informative', 'promotional', 'comparative', 'deal-focused'].includes(parsed.tone)
        ? parsed.tone
        : 'informative',
      cpc_rate_suggestion: Math.max(500, Number(parsed.cpc_rate_suggestion) || 2500),
      budget_suggestion: Math.max(100000, Number(parsed.budget_suggestion) || 2000000),
      research_summary: String(parsed.research_summary || ''),
      offerings: Array.isArray(parsed.offerings)
        ? parsed.offerings
            .map((o) => ({
              name: String(o.name || '').slice(0, 120),
              type: o.type === 'service' ? 'service' : 'product',
              description: String(o.description || '').slice(0, 500),
              url: String(o.url || brand_url || '').slice(0, 500),
              price_hint: String(o.price_hint || '').slice(0, 80),
              keywords: Array.isArray(o.keywords)
                ? o.keywords.map(String).slice(0, 12)
                : [],
            }))
            .filter((o) => o.name)
            .slice(0, 12)
        : [],
    };
  } catch (err) {
    console.error('Campaign research failed:', err.message);
    return { error: err.message || 'AI tadqiqot muvaffaqiyatsiz' };
  }
}
