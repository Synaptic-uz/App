/**
 * Category + subcategory taxonomy for prompt detection and campaign setup.
 */

export const OTHER_CATEGORY_ID = 'other';
export const OTHER_SUBCATEGORY_ID = 'custom';

export const TAXONOMY = {
  shopping_retail: {
    label: 'Shopping & Retail',
    subcategories: {
      electronics: {
        label: 'Electronics & tech',
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
        label: 'Fashion & apparel',
        signals: [
          'kiyim', 'moda', 'fashion', 'dress', 'style', 'kechak',
          'oyoq kiyim', 'krossovka', 'sneaker', 'poyabzal', 'shoes',
          'sumka', 'bag', 'aksessuar', 'soat', 'watch', 'zargarlik',
        ],
      },
      beauty: {
        label: 'Beauty & personal care',
        signals: [
          'kosmetika', 'parfyum', 'perfume', 'skincare', 'soch', 'hair', 'beauty', 'go\'zallik',
          'dorixona', 'pharmacy', 'dori', 'vitamin', 'apteka', 'health',
        ],
      },
      home: {
        label: 'Home & furniture',
        signals: [
          'mebel', 'furniture', 'divan', 'stol', 'interior', 'uy jihozlari',
          'remont', 'qurilish', 'bo\'yoq', 'plitka', 'diy', 'construction',
        ],
      },
      kids: {
        label: 'Kids & baby',
        signals: ['bolalar', 'kids', 'o\'yinchoq', 'toy', 'chaqaloq', 'baby', 'maktab'],
      },
      sports: {
        label: 'Sports & fitness',
        signals: ['sport', 'fitness', 'zal', 'gym', 'to\'p', 'futbol', 'trekking'],
      },
      marketplace: {
        label: 'Marketplace & retail',
        signals: ['marketplace', 'internet do\'kon', 'onlayn do\'kon', 'xarid', 'buyurtma', 'sotib ol'],
      },
    },
  },
  food_lifestyle: {
    label: 'Food & Lifestyle',
    subcategories: {
      delivery: {
        label: 'Food delivery',
        signals: ['yetkazib', 'delivery', 'ovqat', 'pizza', 'sushi', 'taom', 'restaurant', 'buyurtma'],
      },
      groceries: {
        label: 'Groceries & supermarket',
        signals: ['supermarket', 'groceries', 'mahsulot', 'oziq ovqat', 'non', 'sut', 'go\'sht'],
      },
      coffee: {
        label: 'Coffee & cafe',
        signals: ['qahva', 'kofe', 'coffee', 'espresso', 'cappuccino', 'latte', 'cafe'],
      },
      pets: {
        label: 'Pets',
        signals: ['hayvon', 'pet', 'mushuk', 'it', 'dog', 'cat', 'oziq hayvon'],
      },
    },
  },
  finance_services: {
    label: 'Finance & Services',
    subcategories: {
      installment: {
        label: 'Buy now, pay later',
        signals: ['muddatli tolov', 'kredit', "bo'lib to'lash", 'installment', '0%'],
      },
      banking: {
        label: 'Banking & cards',
        signals: ['bank', 'karta', 'card', 'pul o\'tkazma', 'deposit', 'loan'],
      },
      insurance: {
        label: 'Insurance',
        signals: ['sug\'urta', 'insurance', 'policy', 'kasko'],
      },
      general_services: {
        label: 'General B2B & consumer services',
        signals: ['xizmat', 'service', 'consulting', 'agency', 'subscription', 'saas'],
      },
      cloud: {
        label: 'Cloud & developer tools',
        signals: ['cloud', 'hosting', 'server', 'developer', 'api', 'coding'],
      },
    },
  },
  travel_transport: {
    label: 'Travel & Transport',
    subcategories: {
      trips_hotels: {
        label: 'Trips & hotels',
        signals: ['sayohat', 'turizm', "ta'til", 'travel', 'mehmonxona', 'hotel', 'chipta', 'vacation'],
      },
      flights: {
        label: 'Flights & tickets',
        signals: ['flight', 'samolyot', 'avia', 'bilet', 'airport'],
      },
      taxi: {
        label: 'Taxi & ride-hailing',
        signals: ['taxi', 'yandex go', 'mashina chaqirish', 'ride'],
      },
      auto: {
        label: 'Cars & auto parts',
        signals: ['mashina', 'avto', 'car', 'avtomobil', 'zapchast', 'auto', 'haydovchi'],
      },
    },
  },
  education_media: {
    label: 'Education & Media',
    subcategories: {
      university: {
        label: 'Universities & admissions',
        signals: [
          'universitet', 'university', 'abituriyent', 'magistratura', 'bakalavr',
          'college', 'o\'qish', 'oqish', 'talim', 'ta\'lim', 'fakultet', 'grant',
          'stipendiya', 'qabul', 'admission', 'campus',
        ],
      },
      courses: {
        label: 'Courses & tutoring',
        signals: ['kurs', 'course', 'learn', 'tutor', 'online course', 'training'],
      },
      books: {
        label: 'Books & stationery',
        signals: ['kitob', 'book', 'daftar', 'stationery', 'qalam'],
      },
      streaming: {
        label: 'Streaming & subscriptions',
        signals: ['streaming', 'film', 'movie', 'music', 'subscription', 'video'],
      },
      events: {
        label: 'Events & tickets',
        signals: ['bilet', 'ticket', 'konsert', 'concert', 'teatr', 'event'],
      },
    },
  },
  real_estate: {
    label: 'Real Estate',
    subcategories: {
      rent: {
        label: 'Rent & lease',
        signals: ['ijara', 'rent', 'kvartira', 'apartment', 'uy ijarasi'],
      },
      buy: {
        label: 'Buy property',
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
    label: 'Other — not listed above',
    subcategories: [{ id: OTHER_SUBCATEGORY_ID, label: 'Custom (describe your business)' }],
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
  const parts = [
    campaign.name,
    campaign.category,
    campaign.custom_category,
    campaign.subcategory || 'general',
    campaign.tagline,
    campaign.description,
    ...(campaign.keywords || []),
    ...(campaign.niche_keywords || []),
  ];
  return parts.filter(Boolean).join(' ').trim();
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
