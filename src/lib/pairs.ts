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
  // Geçici test paritesi — zengin bildirim görünümünü tüm cihazlarda
  // (Mac/iOS/Windows/Linux) hızlıca test etmek için. Gerçek bir kur çekmez,
  // sunucu tarafında salınımlı bir sahte değer üretir. Test bitince bu
  // satır ve ilişkili TEST_SAMPLES/cron dalı kaldırılabilir.
  { base: 'TEST', quote: 'DEMO', decimals: 2, span: 20 },
];

/** Test bildirimlerinde sırayla gösterilecek örnek pariteler — her tetiklemede
 * farklı bir kur/format görünsün diye (gerçek verileri kullanmaz). */
export const TEST_SAMPLES: { key: string; value: number; rate: number; decimals: number; dir: 'above' | 'below' }[] = [
  { key: 'USD/TRY', value: 34.5, rate: 34.62, decimals: 2, dir: 'above' },
  { key: 'EUR/USD', value: 1.085, rate: 1.0839, decimals: 4, dir: 'below' },
  { key: 'BTC/USD', value: 65000, rate: 65420, decimals: 0, dir: 'above' },
  { key: 'GBP/JPY', value: 190.2, rate: 189.85, decimals: 2, dir: 'below' },
  { key: 'BTC/TRY', value: 2150000, rate: 2168400, decimals: 0, dir: 'above' },
  { key: 'EUR/TRY', value: 37.1, rate: 37.24, decimals: 2, dir: 'above' },
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
