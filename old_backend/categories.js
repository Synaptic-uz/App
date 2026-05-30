/**
 * Category + subcategory taxonomy for prompt detection and campaign setup.
 */

export const OTHER_CATEGORY_ID = 'other';
export const OTHER_SUBCATEGORY_ID = 'custom';

export const TAXONOMY = {
  shopping_retail: {
    label: 'Xarid va chakana savdo',
    subcategories: {
      electronics: {
        label: 'Elektronika va texnika',
        signals: [
          'noutbuk', 'laptop', 'telefon', 'phone', 'iphone', 'samsung', 'smartphone',
          'planshet', 'tablet', 'kompyuter', 'elektronika', 'texnika', 'gadjet', 'narxi',
          'gaming pc', 'gaming noutbuk', 'gaming laptop', 'gaming', 'gamer', 'rtx', 'gpu',
          'playstation', 'ps5', 'xbox', 'steam', 'oyin', "o'yin", 'klaviatura', 'naushnik',
          'televizor', 'tv', 'muzlatgich', 'kir yuvish', 'konditsioner', 'mikroto\'lqin',
          'microwave', 'maishiy texnika',
        ],
      },
      fashion: {
        label: 'Moda va kiyim-kechak',
        signals: [
          'kiyim', 'moda', 'fashion', 'dress', 'style', 'kechak',
          'oyoq kiyim', 'krossovka', 'sneaker', 'poyabzal', 'shoes',
          'sumka', 'bag', 'aksessuar', 'soat', 'watch', 'zargarlik',
        ],
      },
      beauty: {
        label: 'Go‘zallik va shaxsiy parvarish',
        signals: [
          'kosmetika', 'parfyum', 'perfume', 'skincare', 'soch', 'hair', 'beauty', 'go\'zallik',
          'dorixona', 'pharmacy', 'dori', 'vitamin', 'apteka', 'health',
        ],
      },
      home: {
        label: 'Uy va mebel',
        signals: [
          'mebel', 'furniture', 'divan', 'stol', 'interior', 'uy jihozlari',
          'remont', 'qurilish', 'bo\'yoq', 'plitka', 'diy', 'construction',
        ],
      },
      kids: {
        label: 'Bolalar va chaqaloq',
        signals: ['bolalar', 'kids', 'o\'yinchoq', 'toy', 'chaqaloq', 'baby', 'maktab'],
      },
      sports: {
        label: 'Sport va fitnes',
        signals: ['sport', 'fitness', 'zal', 'gym', 'to\'p', 'futbol', 'trekking'],
      },
      marketplace: {
        label: 'Marketpleys va chakana',
        signals: ['marketplace', 'internet do\'kon', 'onlayn do\'kon', 'xarid', 'buyurtma', 'sotib ol'],
      },
    },
  },
  food_lifestyle: {
    label: 'Ovqat va turmush tarzi',
    subcategories: {
      delivery: {
        label: 'Ovqat yetkazib berish',
        signals: ['yetkazib', 'delivery', 'ovqat', 'pizza', 'sushi', 'taom', 'restaurant', 'buyurtma'],
      },
      groceries: {
        label: 'Oziq-ovqat va supermarket',
        signals: ['supermarket', 'groceries', 'mahsulot', 'oziq ovqat', 'non', 'sut', 'go\'sht'],
      },
      coffee: {
        label: 'Qahva va kafe',
        signals: ['qahva', 'kofe', 'coffee', 'espresso', 'cappuccino', 'latte', 'cafe'],
      },
      pets: {
        label: 'Uy hayvonlari',
        signals: ['hayvon', 'pet', 'mushuk', 'it', 'dog', 'cat', 'oziq hayvon'],
      },
    },
  },
  finance_services: {
    label: 'Moliya va xizmatlar',
    subcategories: {
      installment: {
        label: 'Muddatli to‘lov',
        signals: ['muddatli tolov', 'kredit', "bo'lib to'lash", 'installment', '0%'],
      },
      banking: {
        label: 'Bank va kartalar',
        signals: ['bank', 'karta', 'card', 'pul o\'tkazma', 'deposit', 'loan'],
      },
      insurance: {
        label: 'Sug‘urta',
        signals: ['sug\'urta', 'insurance', 'policy', 'kasko'],
      },
      general_services: {
        label: 'B2B va iste’mol xizmatlari',
        signals: ['xizmat', 'service', 'consulting', 'agency', 'subscription', 'saas'],
      },
      cloud: {
        label: 'Bulut va dasturchi vositalari',
        signals: ['cloud', 'hosting', 'server', 'developer', 'api', 'coding'],
      },
    },
  },
  travel_transport: {
    label: 'Sayohat va transport',
    subcategories: {
      trips_hotels: {
        label: 'Sayohat va mehmonxonalar',
        signals: ['sayohat', 'turizm', "ta'til", 'travel', 'mehmonxona', 'hotel', 'chipta', 'vacation'],
      },
      flights: {
        label: 'Parvozlar va chiptalar',
        signals: ['flight', 'samolyot', 'avia', 'bilet', 'airport'],
      },
      taxi: {
        label: 'Taksi va mashina chaqirish',
        signals: ['taxi', 'yandex go', 'mashina chaqirish', 'ride'],
      },
      auto: {
        label: 'Avtomobillar va ehtiyot qismlar',
        signals: ['mashina', 'avto', 'car', 'avtomobil', 'zapchast', 'auto', 'haydovchi'],
      },
    },
  },
  education_media: {
    label: 'Ta’lim va media',
    subcategories: {
      university: {
        label: 'Universitetlar va qabul',
        signals: [
          'universitet', 'university', 'abituriyent', 'magistratura', 'bakalavr',
          'college', 'o\'qish', 'oqish', 'talim', 'ta\'lim', 'fakultet', 'grant',
          'stipendiya', 'qabul', 'admission', 'campus',
        ],
      },
      courses: {
        label: 'Kurslar va repetitorlik',
        signals: ['kurs', 'course', 'learn', 'tutor', 'online course', 'training'],
      },
      books: {
        label: 'Kitoblar va kanselyariya',
        signals: ['kitob', 'book', 'daftar', 'stationery', 'qalam'],
      },
      streaming: {
        label: 'Striming va obunalar',
        signals: ['streaming', 'film', 'movie', 'music', 'subscription', 'video'],
      },
      events: {
        label: 'Tadbirlar va chiptalar',
        signals: ['bilet', 'ticket', 'konsert', 'concert', 'teatr', 'event'],
      },
    },
  },
  real_estate: {
    label: 'Ko‘chmas mulk',
    subcategories: {
      rent: {
        label: 'Ijara',
        signals: ['ijara', 'rent', 'kvartira', 'apartment', 'uy ijarasi'],
      },
      buy: {
        label: 'Mulk sotib olish',
        signals: ['sotiladi', 'uy sotib', 'real estate', 'property', 'dom'],
      },
    },
  },
};

/** Flat list for API + forms (includes Other) */
export function getCategoryOptions() {
  const list = Object.entries(TAXONOMY).map(([id, cat]) => ({
    id,
    label: cat.label,
    subcategories: Object.entries(cat.subcategories).map(([subId, sub]) => ({
      id: subId,
      label: sub.label,
    })),
  }));

  list.push({
    id: OTHER_CATEGORY_ID,
    label: 'Boshqa — yuqorida yo‘q',
    subcategories: [{ id: OTHER_SUBCATEGORY_ID, label: 'Maxsus (biznesingizni yozing)' }],
    allowCustomLabel: true,
  });

  return list;
}

export function isOtherCategory(category) {
  return category === OTHER_CATEGORY_ID;
}

function countSignalHits(lower, signals) {
  let hits = 0;
  const matched = [];
  for (const s of signals || []) {
    const sig = s.toLowerCase().trim();
    if (sig.length >= 3 && lower.includes(sig)) {
      hits++;
      matched.push(sig);
    }
  }
  return { hits, matched };
}

export function detectPromptIntent(prompt) {
  const lower = prompt.toLowerCase();
  let best = { category: null, subcategory: null, score: 0, matched: [] };

  for (const [category, catDef] of Object.entries(TAXONOMY)) {
    for (const [subcategory, subDef] of Object.entries(catDef.subcategories)) {
      const { hits, matched } = countSignalHits(lower, subDef.signals);
      if (hits > best.score) {
        best = { category, subcategory, score: hits, matched };
      }
    }
  }

  if (best.score === 0) return { category: null, subcategory: null, score: 0, matched: [] };
  return best;
}

export function buildCampaignProfileText(campaign) {
  const catDef = TAXONOMY[campaign.category];
  const catLabel = catDef ? catDef.label : (campaign.category === OTHER_CATEGORY_ID ? campaign.custom_category : campaign.category);

  const subcatDef = catDef?.subcategories[campaign.subcategory];
  const subcatLabel = subcatDef ? subcatDef.label : (campaign.subcategory === OTHER_SUBCATEGORY_ID ? '' : campaign.subcategory);

  const subSignals = subcatDef?.signals?.slice(0, 12) || [];

  const parts = [
    `Brend: ${campaign.name}`,
    catLabel && `Kategoriya: ${catLabel}`,
    subcatLabel && `Subkategoriya: ${subcatLabel}`,
    campaign.tagline && `Shior: ${campaign.tagline}`,
    campaign.description,
    campaign.tone && `Ohang: ${campaign.tone}`,
    campaign.keywords?.length && `Kalit so'zlar: ${campaign.keywords.join(', ')}`,
    campaign.niche_keywords?.length && `Niche: ${campaign.niche_keywords.join(', ')}`,
    campaign.offerings?.length &&
      `Mahsulot va xizmatlar: ${campaign.offerings
        .map((o) => {
          const kind = o.type === 'service' ? 'xizmat' : 'mahsulot';
          const kw = o.keywords?.length ? ` (${o.keywords.join(', ')})` : '';
          const price = o.price_hint ? `, ${o.price_hint}` : '';
          return `${o.name} [${kind}]${price}${kw}`;
        })
        .join('; ')}`,
    subSignals.length && `Mavzu signallari: ${subSignals.join(', ')}`,
    'O\'zbekiston bozori, AI chat va Telegram bot konteksti',
  ];
  return parts.filter(Boolean).join('. ').trim();
}

export function campaignSubcategory(campaign) {
  if (isOtherCategory(campaign.category)) return campaign.subcategory || OTHER_SUBCATEGORY_ID;
  return campaign.subcategory || 'general';
}

export function displayCategory(campaign) {
  if (isOtherCategory(campaign.category) && campaign.custom_category) {
    return campaign.custom_category;
  }
  const cat = TAXONOMY[campaign.category];
  return cat?.label || campaign.category;
}

export function defaultSubcategory(category) {
  if (isOtherCategory(category)) return OTHER_SUBCATEGORY_ID;
  const cat = TAXONOMY[category];
  if (!cat) return 'general';
  const keys = Object.keys(cat.subcategories);
  return keys.includes('general') ? 'general' : keys[0];
}

/** AI prompt uchun to‘liq kategoriya ro‘yxati */
export function getCategoryTaxonomyForPrompt() {
  return getCategoryOptions().map((c) => ({
    id: c.id,
    label: c.label,
    subcategories: c.subcategories.map((s) => s.id),
  }));
}

const CATEGORY_ALIASES = {
  retail: 'shopping_retail',
  shopping: 'shopping_retail',
  food: 'food_lifestyle',
  education: 'education_media',
  finance: 'finance_services',
  tech: 'shopping_retail',
  technology: 'shopping_retail',
  health: 'shopping_retail',
  travel: 'travel_transport',
  services: 'finance_services',
  real_estate: 'real_estate',
  other: 'other',
};

/**
 * AI research javobidagi kategoriya ID larini loyiha taxonomiyasiga moslashtiradi.
 */
export function resolveCategoryFromResearch(rawCategory, rawSubcategory) {
  let category = String(rawCategory || '').trim().toLowerCase();
  if (CATEGORY_ALIASES[category]) category = CATEGORY_ALIASES[category];
  if (!TAXONOMY[category]) category = OTHER_CATEGORY_ID;

  let subcategory = String(rawSubcategory || '').trim().toLowerCase();
  const catDef = TAXONOMY[category];
  if (catDef && subcategory && !catDef.subcategories[subcategory]) {
    const keys = Object.keys(catDef.subcategories);
    const fuzzy = keys.find((k) => k.includes(subcategory) || subcategory.includes(k));
    subcategory = fuzzy || defaultSubcategory(category);
  }
  if (!subcategory) subcategory = defaultSubcategory(category);

  return { category, subcategory };
}
