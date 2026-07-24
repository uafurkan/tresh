export interface PairDef {
  base: string;
  quote: string;
  decimals: number;
  /** Görsel su aralığı — eşik/su seviyesi bu banda normalize edilir. */
  span: number;
}

export const PAIR_CATALOG: PairDef[] = [
  { base: 'USD', quote: 'TRY', decimals: 2, span: 1.2 },
  { base: 'EUR', quote: 'TRY', decimals: 2, span: 1.4 },
  { base: 'EUR', quote: 'USD', decimals: 4, span: 0.028 },
  { base: 'GBP', quote: 'USD', decimals: 4, span: 0.03 },
  { base: 'GBP', quote: 'JPY', decimals: 2, span: 6 },
  { base: 'USD', quote: 'JPY', decimals: 2, span: 5 },
  { base: 'BTC', quote: 'USD', decimals: 0, span: 6000 },
  { base: 'BTC', quote: 'TRY', decimals: 0, span: 300000 },
];

/** Yahoo Finance'te "BASE-QUOTE" ticker biçimini kullanan kripto varlıklar. */
export const CRYPTO_BASES = new Set(['BTC', 'ETH']);

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
