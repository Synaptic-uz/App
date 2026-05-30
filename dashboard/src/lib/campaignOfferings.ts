export type CampaignOffering = {
  clientId: string;
  name: string;
  type: 'product' | 'service';
  description: string;
  url: string;
  price_hint: string;
  keywords: string;
};

export function newOffering(partial?: Partial<CampaignOffering>): CampaignOffering {
  return {
    clientId: crypto.randomUUID(),
    name: '',
    type: 'product',
    description: '',
    url: '',
    price_hint: '',
    keywords: '',
    ...partial,
  };
}

export function offeringsFromApi(raw: unknown): CampaignOffering[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((o) => {
    const item = o as Record<string, unknown>;
    return {
      clientId: crypto.randomUUID(),
      name: String(item.name ?? ''),
      type: item.type === 'service' ? 'service' : 'product',
      description: String(item.description ?? ''),
      url: String(item.url ?? ''),
      price_hint: String(item.price_hint ?? ''),
      keywords: Array.isArray(item.keywords) ? (item.keywords as string[]).join(', ') : '',
    };
  });
}

export function offeringsToApi(offerings: CampaignOffering[]) {
  return offerings
    .map((o) => ({
      name: o.name.trim(),
      type: o.type,
      description: o.description.trim(),
      url: o.url.trim(),
      price_hint: o.price_hint.trim(),
      keywords: o.keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
    }))
    .filter((o) => o.name.length > 0);
}

export function offeringsFromResearch(raw: unknown): CampaignOffering[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((o) => {
    const item = o as Record<string, unknown>;
    return newOffering({
      name: String(item.name ?? ''),
      type: item.type === 'service' ? 'service' : 'product',
      description: String(item.description ?? ''),
      url: String(item.url ?? ''),
      price_hint: String(item.price_hint ?? ''),
      keywords: Array.isArray(item.keywords) ? (item.keywords as string[]).join(', ') : '',
    });
  });
}
