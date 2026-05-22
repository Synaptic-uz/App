export type SubcategoryOption = { id: string; label: string };
export type CategoryOption = {
  id: string;
  label: string;
  subcategories: SubcategoryOption[];
  allowCustomLabel?: boolean;
};

/** API ishlamasa — zaxira kategoriyalar */
export const FALLBACK_CATEGORIES: CategoryOption[] = [
  {
    id: 'shopping_retail',
    label: 'Xarid va chakana savdo',
    subcategories: [
      { id: 'electronics', label: 'Elektronika va texnika' },
      { id: 'fashion', label: 'Moda va kiyim-kechak' },
      { id: 'beauty', label: 'Go‘zallik va shaxsiy parvarish' },
      { id: 'home', label: 'Uy va mebel' },
      { id: 'kids', label: 'Bolalar va chaqaloq' },
      { id: 'sports', label: 'Sport va fitnes' },
      { id: 'marketplace', label: 'Marketpleys va chakana' },
    ],
  },
  {
    id: 'food_lifestyle',
    label: 'Ovqat va turmush tarzi',
    subcategories: [
      { id: 'delivery', label: 'Ovqat yetkazib berish' },
      { id: 'groceries', label: 'Oziq-ovqat va supermarket' },
      { id: 'coffee', label: 'Qahva va kafe' },
      { id: 'pets', label: 'Uy hayvonlari' },
    ],
  },
  {
    id: 'finance_services',
    label: 'Moliya va xizmatlar',
    subcategories: [
      { id: 'installment', label: 'Muddatli to‘lov' },
      { id: 'banking', label: 'Bank va kartalar' },
      { id: 'insurance', label: 'Sug‘urta' },
      { id: 'general_services', label: 'B2B va iste’mol xizmatlari' },
      { id: 'cloud', label: 'Bulut va dasturchi vositalari' },
    ],
  },
  {
    id: 'travel_transport',
    label: 'Sayohat va transport',
    subcategories: [
      { id: 'trips_hotels', label: 'Sayohat va mehmonxonalar' },
      { id: 'flights', label: 'Parvozlar va chiptalar' },
      { id: 'taxi', label: 'Taksi va mashina chaqirish' },
      { id: 'auto', label: 'Avtomobillar va ehtiyot qismlar' },
    ],
  },
  {
    id: 'education_media',
    label: 'Ta’lim va media',
    subcategories: [
      { id: 'university', label: 'Universitetlar va qabul' },
      { id: 'courses', label: 'Kurslar va repetitorlik' },
      { id: 'books', label: 'Kitoblar va kanselyariya' },
      { id: 'streaming', label: 'Striming va obunalar' },
      { id: 'events', label: 'Tadbirlar va chiptalar' },
    ],
  },
  {
    id: 'real_estate',
    label: 'Ko‘chmas mulk',
    subcategories: [
      { id: 'rent', label: 'Ijara' },
      { id: 'buy', label: 'Mulk sotib olish' },
    ],
  },
  {
    id: 'other',
    label: 'Boshqa — yuqorida yo‘q',
    subcategories: [{ id: 'custom', label: 'Maxsus (biznesingizni yozing)' }],
    allowCustomLabel: true,
  },
];
