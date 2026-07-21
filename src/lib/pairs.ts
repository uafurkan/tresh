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
];

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
