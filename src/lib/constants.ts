export const PRODUCT_CATEGORIES = [
  { value: 'foundation', label: 'Foundation', emoji: '🧴' },
  { value: 'lipstick', label: 'Lipstick', emoji: '💄' },
  { value: 'skincare', label: 'Skincare', emoji: '✨' },
  { value: 'fragrance', label: 'Fragrance', emoji: '🌸' },
  { value: 'nails', label: 'Nails', emoji: '💅' },
  { value: 'eyeshadow', label: 'Eyeshadow', emoji: '👁️' },
  { value: 'blush', label: 'Blush', emoji: '🌺' },
  { value: 'concealer', label: 'Concealer', emoji: '🪞' },
  { value: 'mascara', label: 'Mascara', emoji: '🖤' },
  { value: 'other', label: 'Other', emoji: '🎀' },
] as const;

export const PRODUCT_CONDITIONS = [
  { value: 'sealed', label: 'Sealed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'opened_once', label: 'Opened Once', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'swatched', label: 'Swatched', color: 'bg-amber-100 text-amber-700 border-amber-200' },
] as const;

export type ProductCategory = 'foundation' | 'lipstick' | 'skincare' | 'fragrance' | 'nails' | 'eyeshadow' | 'blush' | 'concealer' | 'mascara' | 'other';
export type ProductCondition = 'sealed' | 'opened_once' | 'swatched';
