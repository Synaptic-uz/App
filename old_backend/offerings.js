/**
 * Campaign offerings (products / services) helpers.
 */

export function normalizeOfferings(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((o) => {
      const keywords = Array.isArray(o.keywords)
        ? o.keywords.map(String).map((s) => s.trim()).filter(Boolean)
        : String(o.keywords || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

      return {
        name: String(o.name || '').trim().slice(0, 120),
        type: o.type === 'service' ? 'service' : 'product',
        description: String(o.description || '').trim().slice(0, 500),
        url: String(o.url || '').trim().slice(0, 500),
        price_hint: String(o.price_hint || '').trim().slice(0, 80),
        keywords: keywords.slice(0, 12),
      };
    })
    .filter((o) => o.name.length > 0)
    .slice(0, 30);
}

export function mergeKeywordsFromOfferings(campaignKeywords, offerings) {
  const base = Array.isArray(campaignKeywords) ? [...campaignKeywords] : [];
  const seen = new Set(base.map((k) => k.toLowerCase()));

  for (const o of offerings || []) {
    for (const kw of [o.name, ...(o.keywords || [])]) {
      const t = String(kw || '').trim();
      if (t.length < 2) continue;
      const key = t.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        base.push(t);
      }
    }
  }
  return base.slice(0, 40);
}
