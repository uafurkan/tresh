import { PAIR_CATALOG, CONVERTER_PAIRS, CRYPTO_BASES, pairKey } from '@/lib/pairs';

export interface RateQuote {
  pair: string;
  rate: number;
  ts: number;
  source: string;
}

const TIMEOUT_MS = 6000;

async function fetchJson(url: string): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: 'no-store',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; TreshBot/1.0)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Yahoo Finance — anahtar gerektirmez, gerçek zamanlıya en yakın kaynak. */
async function fromYahoo(base: string, quote: string): Promise<RateQuote> {
  // Kripto varlıklar Yahoo'da "BTC-USD" biçiminde, fiat pariteler "EURUSD=X" biçiminde.
  const sym = CRYPTO_BASES.has(base) ? `${base}-${quote}` : `${base}${quote}=X`;
  const data = await fetchJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1m&range=1d`
  );
  const meta = data?.chart?.result?.[0]?.meta;
  const rate = Number(meta?.regularMarketPrice);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('yahoo: no price');
  return { pair: pairKey(base, quote), rate, ts: (meta.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000, source: 'yahoo' };
}

/** exchangerate.host — RATES_API_KEY varsa canlı kaynak olarak kullanılır. */
async function fromExchangerateHost(base: string, quote: string): Promise<RateQuote> {
  const key = process.env.RATES_API_KEY;
  if (!key) throw new Error('exchangerate.host: no api key');
  const data = await fetchJson(
    `https://api.exchangerate.host/live?access_key=${key}&source=${base}&currencies=${quote}`
  );
  const rate = Number(data?.quotes?.[`${base}${quote}`]);
  if (!data?.success || !Number.isFinite(rate)) throw new Error('exchangerate.host: no price');
  return { pair: pairKey(base, quote), rate, ts: (data.timestamp ?? Math.floor(Date.now() / 1000)) * 1000, source: 'exchangerate.host' };
}

/** open.er-api.com — anahtarsız, günlük güncellenen sağlam yedek. */
async function fromOpenErApi(base: string, quote: string): Promise<RateQuote> {
  const data = await fetchJson(`https://open.er-api.com/v6/latest/${base}`);
  const rate = Number(data?.rates?.[quote]);
  if (data?.result !== 'success' || !Number.isFinite(rate)) throw new Error('open.er-api: no price');
  return { pair: pairKey(base, quote), rate, ts: (data.time_last_update_unix ?? Math.floor(Date.now() / 1000)) * 1000, source: 'open.er-api' };
}

/** frankfurter.dev (ECB) — son çare yedek. */
async function fromFrankfurter(base: string, quote: string): Promise<RateQuote> {
  const data = await fetchJson(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${quote}`);
  const rate = Number(data?.rates?.[quote]);
  if (!Number.isFinite(rate)) throw new Error('frankfurter: no price');
  return { pair: pairKey(base, quote), rate, ts: Date.now(), source: 'frankfurter' };
}

const PROVIDERS = [fromYahoo, fromExchangerateHost, fromOpenErApi, fromFrankfurter];

// Kısa süreli bellek-içi önbellek: sağlayıcıları dakikada onlarca kez dövmemek için.
const cache = new Map<string, RateQuote>();
const CACHE_TTL_MS = 10_000;

export async function getRate(base: string, quote: string): Promise<RateQuote> {
  const key = pairKey(base, quote);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS && hit.source === 'cache-fresh') return hit;
  const cachedAt = (hit as any)?.fetchedAt as number | undefined;
  if (hit && cachedAt && Date.now() - cachedAt < CACHE_TTL_MS) return hit;

  const errors: string[] = [];
  for (const provider of PROVIDERS) {
    try {
      const q = await provider(base, quote);
      (q as any).fetchedAt = Date.now();
      cache.set(key, q);
      return q;
    } catch (e: any) {
      errors.push(e?.message ?? String(e));
    }
  }
  // Tüm sağlayıcılar düştüyse eski önbelleği "bayat" işaretiyle döndür.
  if (hit) return { ...hit, source: `${hit.source} (stale)` };
  throw new Error(`All rate providers failed: ${errors.join(' | ')}`);
}

const ALLOWED_PAIRS = new Set([
  ...PAIR_CATALOG.map((c) => pairKey(c.base, c.quote)),
  ...CONVERTER_PAIRS,
]);

export async function getRates(pairs: string[]): Promise<RateQuote[]> {
  const valid = pairs.filter((p) => ALLOWED_PAIRS.has(p));
  return Promise.all(
    valid.map((p) => {
      const [base, quote] = p.split('/');
      return getRate(base, quote);
    })
  );
}
