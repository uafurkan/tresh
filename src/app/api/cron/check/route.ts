import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/server/store';
import { getRates } from '@/lib/server/rates';
import { sendPush } from '@/lib/server/push';
import { pairKey } from '@/lib/pairs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Vercel Cron (dakikada bir): tüm izleyicilerin paritelerini tek seferde çek,
 * eşik geçişlerini tespit et, geçenlere Web Push gönder.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const repo = getRepository();
  const watchers = await repo.getAll();
  if (watchers.length === 0) return NextResponse.json({ ok: true, watchers: 0, sent: 0 });

  const pairs = [...new Set(
    watchers.flatMap((w) => w.thresholds.filter((t) => !t.paused).map((t) => pairKey(t.base, t.quote)))
  )];
  if (pairs.length === 0) return NextResponse.json({ ok: true, watchers: watchers.length, sent: 0 });

  const quotes = await getRates(pairs);
  const rateMap = new Map(quotes.map((q) => [q.pair, q.rate]));

  let sent = 0;
  for (const w of watchers) {
    let dirty = false;
    let dead = false;
    for (const t of w.thresholds) {
      if (t.paused) continue;
      const key = pairKey(t.base, t.quote);
      const rate = rateMap.get(key);
      if (rate == null) continue;
      const prev = w.lastRates[t.id];
      if (prev != null) {
        const crossed = t.dir === 'above'
          ? prev < t.value && rate >= t.value
          : prev > t.value && rate <= t.value;
        if (crossed) {
          const verb = t.dir === 'above' ? 'geçti' : 'altına indi';
          const alive = await sendPush(w.subscription, {
            title: 'Tresh',
            body: `${key} ${t.value.toFixed(t.decimals)}'${t.dir === 'above' ? 'i' : 'nin'} ${verb} — şu an ${rate.toFixed(t.decimals)}.`,
            tag: `tresh-${t.id}`,
            url: '/app',
          });
          if (!alive) { dead = true; break; }
          sent++;
        }
      }
      if (w.lastRates[t.id] !== rate) { w.lastRates[t.id] = rate; dirty = true; }
    }
    if (dead) await repo.remove(w.id);
    else if (dirty) { w.updatedAt = Date.now(); await repo.put(w); }
  }

  return NextResponse.json({ ok: true, watchers: watchers.length, pairs: pairs.length, sent });
}
