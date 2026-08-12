/** Parite gruplandırması: pariteyi seçim listesinde hangi başlık altında göstereceğimiz. */
export type PairCategory = 'fiat' | 'crypto' | 'metal';

export interface PairDef {
  base: string;
  quote: string;
  decimals: number;
  /** Görsel su aralığı — eşik/su seviyesi bu banda normalize edilir. */
  span: number;
  category: PairCategory;
}

export const PAIR_CATALOG: PairDef[] = [
  { base: 'USD', quote: 'TRY', decimals: 2, span: 1.2, category: 'fiat' },
  { base: 'EUR', quote: 'TRY', decimals: 2, span: 1.4, category: 'fiat' },
  { base: 'EUR', quote: 'USD', decimals: 4, span: 0.028, category: 'fiat' },
  { base: 'GBP', quote: 'USD', decimals: 4, span: 0.03, category: 'fiat' },
  { base: 'GBP', quote: 'JPY', decimals: 2, span: 6, category: 'fiat' },
  { base: 'USD', quote: 'JPY', decimals: 2, span: 5, category: 'fiat' },
  { base: 'BTC', quote: 'USD', decimals: 0, span: 6000, category: 'crypto' },
  { base: 'BTC', quote: 'TRY', decimals: 0, span: 300000, category: 'crypto' },
  { base: 'ETH', quote: 'USD', decimals: 0, span: 400, category: 'crypto' },
  { base: 'ETH', quote: 'TRY', decimals: 0, span: 20000, category: 'crypto' },
  { base: 'XAU', quote: 'USD', decimals: 2, span: 220, category: 'metal' },
  { base: 'XAU', quote: 'TRY', decimals: 0, span: 10000, category: 'metal' },
  { base: 'XAG', quote: 'USD', decimals: 2, span: 3.5, category: 'metal' },
  { base: 'XAG', quote: 'TRY', decimals: 0, span: 160, category: 'metal' },
  { base: 'XPT', quote: 'USD', decimals: 2, span: 80, category: 'metal' },
  { base: 'XPT', quote: 'TRY', decimals: 0, span: 3500, category: 'metal' },
  { base: 'XPD', quote: 'USD', decimals: 2, span: 90, category: 'metal' },
  { base: 'XPD', quote: 'TRY', decimals: 0, span: 4000, category: 'metal' },
];

/** Yahoo Finance'te "BASE-QUOTE" ticker biçimini kullanan kripto varlıklar. */
export const CRYPTO_BASES = new Set(['BTC', 'ETH']);

/** Emtia bazlı pariteler (altın, gümüş, platin, paladyum) — kripto gibi USD üzerinden sentetik çapraz gerektirir. */
export const COMMODITY_BASES = new Set(['XAU', 'XAG', 'XPT', 'XPD']);

/** Eşik varsayılan adımı yüzdesel hesaplanan (sabit ondalık basamak yerine) tabanlar. */
export const PERCENT_STEP_BASES = new Set([...CRYPTO_BASES, ...COMMODITY_BASES]);

export interface ConverterCurrency {
  code: string;
  name: string;
  /** Kurun çekileceği parite — piyasa geleneğine göre CODE/USD ya da USD/CODE. */
  pair: string;
  /** true ise pair "USD/CODE" biçiminde, yani CODE'nin USD değeri 1/rate'tir. */
  invert: boolean;
}

/** Ana sayfadaki döviz çevirici ve canlı kur tablosunda gösterilen para birimleri. */
export const CONVERTER_CURRENCIES: ConverterCurrency[] = [
  { code: 'EUR', name: 'Euro', pair: 'EUR/USD', invert: false },
  { code: 'GBP', name: 'British Pound', pair: 'GBP/USD', invert: false },
  { code: 'TRY', name: 'Turkish Lira', pair: 'USD/TRY', invert: true },
  { code: 'JPY', name: 'Japanese Yen', pair: 'USD/JPY', invert: true },
  { code: 'CHF', name: 'Swiss Franc', pair: 'USD/CHF', invert: true },
  { code: 'CAD', name: 'Canadian Dollar', pair: 'USD/CAD', invert: true },
  { code: 'AUD', name: 'Australian Dollar', pair: 'AUD/USD', invert: false },
  { code: 'CNY', name: 'Chinese Yuan', pair: 'USD/CNY', invert: true },
  { code: 'BTC', name: 'Bitcoin', pair: 'BTC/USD', invert: false },
  { code: 'ETH', name: 'Ethereum', pair: 'ETH/USD', invert: false },
  { code: 'XAU', name: 'Gold', pair: 'XAU/USD', invert: false },
  { code: 'XAG', name: 'Silver', pair: 'XAG/USD', invert: false },
  { code: 'XPT', name: 'Platinum', pair: 'XPT/USD', invert: false },
  { code: 'XPD', name: 'Palladium', pair: 'XPD/USD', invert: false },
];

export const CONVERTER_PAIRS = [...new Set(CONVERTER_CURRENCIES.map((c) => c.pair))];

export function pairKey(base: string, quote: string): string {
  return `${base}/${quote}`;
}

export function findPair(key: string): PairDef | undefined {
  const [base, quote] = key.split('/');
  return PAIR_CATALOG.find((p) => p.base === base && p.quote === quote);
}

export interface Threshold {
  id: string;
  base: string;
  quote: string;
  decimals: number;
  value: number;
  dir: 'above' | 'below';
  paused: boolean;
  createdAt: number;
}
