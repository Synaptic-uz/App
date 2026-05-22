/**
 * Category + subcategory taxonomy for prompt detection and campaign setup.
 */

export const OTHER_CATEGORY_ID = 'other';
export const OTHER_SUBCATEGORY_ID = 'custom';

export const TAXONOMY = {
  electronics: {
    label: 'Elektronika va texnika',
    subcategories: {
      general: {
        label: 'Telefon, noutbuk va umumiy texnika',
        signals: [
          'noutbuk', 'laptop', 'telefon', 'phone', 'iphone', 'samsung', 'smartphone',
          'planshet', 'tablet', 'kompyuter', 'elektronika', 'texnika', 'gadjet', 'narxi',
        ],
      },
      gaming: {
        label: 'Gaming va aksessuarlar',
        signals: [
          'gaming pc', 'gaming noutbuk', 'gaming laptop', 'gaming', 'gamer', 'rtx', 'gpu',
          'playstation', 'ps5', 'xbox', 'steam', 'oyin', "o'yin", 'klaviatura', 'naushnik',
        ],
      },
      appliances: {
        label: 'Maishiy texnika va TV',
        signals: [
          'televizor', 'tv', 'muzlatgich', 'kir yuvish', 'konditsioner', 'mikroto\'lqin',
          'microwave', 'appliance', 'maishiy texnika',
        ],
      },
    },
  },
  marketplace: {
    label: 'Marketpleys va chakana savdo',
    subcategories: {
      general: {
        label: 'Ko\'p turdagi onlayn do\'kon',
        signals: ['marketplace', 'internet do\'kon', 'onlayn do\'kon', 'xarid', 'buyurtma', 'sotib ol'],
      },
    },
  },
  food: {
    label: 'Ovqat va yetkazib berish',
    subcategories: {
      delivery: {
        label: 'Ovqat yetkazib berish',
        signals: ['yetkazib', 'delivery', 'ovqat', 'pizza', 'sushi', 'taom', 'restaurant', 'buyurtma'],
      },
      groceries: {
        label: 'Supermarket mahsulotlari',
        signals: ['supermarket', 'groceries', 'mahsulot', 'oziq ovqat', 'non', 'sut', 'go\'sht'],
      },
    },
  },
  fashion: {
    label: 'Moda va kiyim',
    subcategories: {
      general: { label: 'Kiyim-kechak', signals: ['kiyim', 'moda', 'fashion', 'dress', 'style', 'kechak'] },
      shoes: { label: 'Oyoq kiyim', signals: ['oyoq kiyim', 'krossovka', 'sneaker', 'poyabzal', 'shoes'] },
      accessories: { label: 'Sumka va aksessuarlar', signals: ['sumka', 'bag', 'aksessuar', 'soat', 'watch', 'zargarlik'] },
    },
  },
  beauty: {
    label: 'Go\'zallik va parvarish',
    subcategories: {
      general: {
        label: 'Kosmetika va parvarish',
        signals: ['kosmetika', 'parfyum', 'perfume', 'skincare', 'soch', 'hair', 'beauty', 'go\'zallik'],
      },
      pharmacy: {
        label: 'Dorixona va sog\'liq mahsulotlari',
        signals: ['dorixona', 'pharmacy', 'dori', 'vitamin', 'apteka', 'health'],
      },
    },
  },
  finance: {
    label: 'Moliya va to\'lovlar',
    subcategories: {
      installment: {
        label: 'Muddatli to\'lov',
        signals: ['muddatli tolov', 'kredit', "bo'lib to'lash", 'installment', '0%'],
      },
      banking: {
        label: 'Bank va kartalar',
        signals: ['bank', 'karta', 'card', 'pul o\'tkazma', 'deposit', 'loan'],
      },
      insurance: {
        label: 'Sug\'urta',
        signals: ['sug\'urta', 'insurance', 'policy', 'kasko'],
      },
    },
  },
  travel: {
    label: 'Sayohat va turizm',
    subcategories: {
      general: {
        label: 'Sayohat va mehmonxonalar',
        signals: ['sayohat', 'turizm', "ta'til", 'travel', 'mehmonxona', 'hotel', 'chipta', 'vacation'],
      },
      flights: {
        label: 'Aviachiptalar',
        signals: ['flight', 'samolyot', 'avia', 'bilet', 'airport'],
      },
    },
  },
  transport: {
    label: 'Transport',
    subcategories: {
      taxi: { label: 'Taksi', signals: ['taxi', 'yandex go', 'mashina chaqirish', 'ride'] },
      auto: {
        label: 'Avtomobil va ehtiyot qismlar',
        signals: ['mashina', 'avto', 'car', 'avtomobil', 'zapchast', 'auto', 'haydovchi'],
      },
    },
  },
  home: {
    label: 'Uy va mebel',
    subcategories: {
      furniture: {
        label: 'Mebel va dekor',
        signals: ['mebel', 'furniture', 'divan', 'stol', 'interior', 'uy jihozlari'],
      },
      renovation: {
        label: 'Ta\'mirlash va DIY',
        signals: ['remont', 'qurilish', 'bo\'yoq', 'plitka', 'diy', 'construction'],
      },
    },
  },
  kids: {
    label: 'Bolalar va chaqaloq',
    subcategories: {
      general: {
        label: 'O\'yinchoq va bolalar mahsulotlari',
        signals: ['bolalar', 'kids', 'o\'yinchoq', 'toy', 'chaqaloq', 'baby', 'maktab'],
      },
    },
  },
  sports: {
    label: 'Sport va fitnes',
    subcategories: {
      general: {
        label: 'Sport kiyim va jihozlar',
        signals: ['sport', 'fitness', 'zal', 'gym', 'to\'p', 'futbol', 'trekking'],
      },
    },
  },
  education: {
    label: 'Ta\'lim',
    subcategories: {
      university: {
        label: 'Universitet va qabul',
        signals: [
          'universitet', 'university', 'abituriyent', 'magistratura', 'bakalavr',
          'college', 'o\'qish', 'oqish', 'talim', 'ta\'lim', 'fakultet', 'grant',
          'stipendiya', 'qabul', 'admission', 'campus',
        ],
      },
      courses: {
        label: 'Kurslar va repetitor',
        signals: ['kurs', 'course', 'learn', 'tutor', 'online course', 'training'],
      },
      books: {
        label: 'Kitoblar va kanselyariya',
        signals: ['kitob', 'book', 'daftar', 'stationery', 'qalam'],
      },
    },
  },
  coffee: {
    label: 'Kofe va kafe',
    subcategories: {
      general: {
        label: 'Kofe va ichimliklar',
        signals: ['qahva', 'kofe', 'coffee', 'espresso', 'cappuccino', 'latte', 'cafe'],
      },
    },
  },
  pets: {
    label: 'Uy hayvonlari',
    subcategories: {
      general: {
        label: 'Uy hayvonlari oziq-ovqati',
        signals: ['hayvon', 'pet', 'mushuk', 'it', 'dog', 'cat', 'oziq hayvon'],
      },
    },
  },
  services: {
    label: 'Xizmatlar va B2B',
    subcategories: {
      general: {
        label: 'Umumiy xizmatlar',
        signals: ['xizmat', 'service', 'consulting', 'agency', 'subscription', 'saas'],
      },
      cloud: {
        label: 'Cloud va dasturchi vositalari',
        signals: ['cloud', 'hosting', 'server', 'developer', 'api', 'coding'],
      },
    },
  },
  entertainment: {
    label: 'Ko\'ngilochar va media',
    subcategories: {
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
    label: 'Ko\'chmas mulk',
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
    label: 'Boshqa — ro\'yxatda yo\'q',
    subcategories: [{ id: OTHER_SUBCATEGORY_ID, label: 'O\'z kategoriyangizni yozing' }],
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
