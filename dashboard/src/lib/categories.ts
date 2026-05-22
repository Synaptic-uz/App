export type SubcategoryOption = { id: string; label: string };
export type CategoryOption = {
  id: string;
  label: string;
  subcategories: SubcategoryOption[];
  allowCustomLabel?: boolean;
};

/** Offline fallback if /api/categories is unavailable */
export const FALLBACK_CATEGORIES: CategoryOption[] = [
  {
    id: 'shopping_retail',
    label: 'Shopping & Retail',
    subcategories: [
      { id: 'electronics', label: 'Electronics & tech' },
      { id: 'fashion', label: 'Fashion & apparel' },
      { id: 'beauty', label: 'Beauty & personal care' },
      { id: 'home', label: 'Home & furniture' },
      { id: 'kids', label: 'Kids & baby' },
      { id: 'sports', label: 'Sports & fitness' },
      { id: 'marketplace', label: 'Marketplace & retail' },
    ],
  },
  {
    id: 'food_lifestyle',
    label: 'Food & Lifestyle',
    subcategories: [
      { id: 'delivery', label: 'Food delivery' },
      { id: 'groceries', label: 'Groceries & supermarket' },
      { id: 'coffee', label: 'Coffee & cafe' },
      { id: 'pets', label: 'Pets' },
    ],
  },
  {
    id: 'finance_services',
    label: 'Finance & Services',
    subcategories: [
      { id: 'installment', label: 'Buy now, pay later' },
      { id: 'banking', label: 'Banking & cards' },
      { id: 'insurance', label: 'Insurance' },
      { id: 'general_services', label: 'General B2B & consumer services' },
      { id: 'cloud', label: 'Cloud & developer tools' },
    ],
  },
  {
    id: 'travel_transport',
    label: 'Travel & Transport',
    subcategories: [
      { id: 'trips_hotels', label: 'Trips & hotels' },
      { id: 'flights', label: 'Flights & tickets' },
      { id: 'taxi', label: 'Taxi & ride-hailing' },
      { id: 'auto', label: 'Cars & auto parts' },
    ],
  },
  {
    id: 'education_media',
    label: 'Education & Media',
    subcategories: [
      { id: 'university', label: 'Universities & admissions' },
      { id: 'courses', label: 'Courses & tutoring' },
      { id: 'books', label: 'Books & stationery' },
      { id: 'streaming', label: 'Streaming & subscriptions' },
      { id: 'events', label: 'Events & tickets' },
    ],
  },
  {
    id: 'real_estate',
    label: 'Real Estate',
    subcategories: [
      { id: 'rent', label: 'Rent & lease' },
      { id: 'buy', label: 'Buy property' },
    ],
  },
  {
    id: 'other',
    label: 'Other — not listed above',
    subcategories: [{ id: 'custom', label: 'Custom (describe your business)' }],
    allowCustomLabel: true,
  },
];
