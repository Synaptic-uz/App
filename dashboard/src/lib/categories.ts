export type SubcategoryOption = { id: string; label: string };
export type CategoryOption = {
  id: string;
  label: string;
  subcategories: SubcategoryOption[];
  allowCustomLabel?: boolean;
};

/** API ishlamasa — o'zbekcha zaxira ro'yxat */
export const FALLBACK_CATEGORIES: CategoryOption[] = [
  {
    id: 'electronics',
    label: 'Elektronika va texnika',
    subcategories: [
      { id: 'general', label: 'Telefon, noutbuk va umumiy texnika' },
      { id: 'gaming', label: 'Gaming va aksessuarlar' },
      { id: 'appliances', label: 'Maishiy texnika va TV' },
    ],
  },
  { id: 'marketplace', label: 'Marketpleys va chakana savdo', subcategories: [{ id: 'general', label: 'Ko\'p turdagi do\'kon' }] },
  {
    id: 'food',
    label: 'Ovqat va yetkazib berish',
    subcategories: [
      { id: 'delivery', label: 'Ovqat yetkazib berish' },
      { id: 'groceries', label: 'Supermarket mahsulotlari' },
    ],
  },
  {
    id: 'fashion',
    label: 'Moda va kiyim',
    subcategories: [
      { id: 'general', label: 'Kiyim-kechak' },
      { id: 'shoes', label: 'Oyoq kiyim' },
      { id: 'accessories', label: 'Aksessuarlar' },
    ],
  },
  {
    id: 'beauty',
    label: 'Go\'zallik va parvarish',
    subcategories: [
      { id: 'general', label: 'Kosmetika' },
      { id: 'pharmacy', label: 'Dorixona' },
    ],
  },
  {
    id: 'finance',
    label: 'Moliya va to\'lovlar',
    subcategories: [
      { id: 'installment', label: 'Muddatli to\'lov' },
      { id: 'banking', label: 'Bank xizmatlari' },
      { id: 'insurance', label: 'Sug\'urta' },
    ],
  },
  {
    id: 'travel',
    label: 'Sayohat va turizm',
    subcategories: [
      { id: 'general', label: 'Sayohat va mehmonxonalar' },
      { id: 'flights', label: 'Aviachiptalar' },
    ],
  },
  {
    id: 'transport',
    label: 'Transport',
    subcategories: [
      { id: 'taxi', label: 'Taksi va ride-hailing' },
      { id: 'auto', label: 'Avtomobil va ehtiyot qismlar' },
    ],
  },
  {
    id: 'home',
    label: 'Uy va mebel',
    subcategories: [
      { id: 'furniture', label: 'Mebel' },
      { id: 'renovation', label: 'Ta\'mirlash' },
    ],
  },
  { id: 'kids', label: 'Bolalar va chaqaloq', subcategories: [{ id: 'general', label: 'Bolalar mahsulotlari' }] },
  { id: 'sports', label: 'Sport va fitnes', subcategories: [{ id: 'general', label: 'Sport kiyim va jihozlar' }] },
  {
    id: 'education',
    label: 'Ta\'lim',
    subcategories: [
      { id: 'university', label: 'Universitet va qabul' },
      { id: 'courses', label: 'Kurslar va repetitor' },
      { id: 'books', label: 'Kitoblar' },
    ],
  },
  { id: 'coffee', label: 'Kofe va kafe', subcategories: [{ id: 'general', label: 'Kofe' }] },
  { id: 'pets', label: 'Uy hayvonlari', subcategories: [{ id: 'general', label: 'Uy hayvonlari mahsulotlari' }] },
  {
    id: 'services',
    label: 'Xizmatlar va B2B',
    subcategories: [
      { id: 'general', label: 'Umumiy xizmatlar' },
      { id: 'cloud', label: 'Cloud va dasturchi vositalari' },
    ],
  },
  {
    id: 'entertainment',
    label: 'Ko\'ngilochar',
    subcategories: [
      { id: 'streaming', label: 'Striming' },
      { id: 'events', label: 'Tadbirlar va chiptalar' },
    ],
  },
  {
    id: 'real_estate',
    label: 'Ko\'chmas mulk',
    subcategories: [
      { id: 'rent', label: 'Ijara' },
      { id: 'buy', label: 'Sotib olish' },
    ],
  },
  {
    id: 'other',
    label: 'Boshqa — ro\'yxatda yo\'q',
    subcategories: [{ id: 'custom', label: 'O\'z kategoriyangiz' }],
    allowCustomLabel: true,
  },
];
