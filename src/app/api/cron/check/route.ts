import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/server/store';
import { getRates } from '@/lib/server/rates';
import { checkAndNotify } from '@/lib/server/checkWatcher';
import { pairKey } from '@/lib/pairs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Vercel Cron (dakikada bir): tüm izleyicilerin paritelerini tek seferde çek,
 * eşik geçişlerini tespit et, geçenlere Web Push gönder.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  // Kopyala-yapıştırdan kalan görünmez satır sonu/boşluk 401'e yol açabiliyordu — iki tarafı da normalize et.
  const auth = req.headers.get('authorization')?.trim();
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const repo = getRepository();
    const watchers = await repo.getAll();
    if (watchers.length === 0) return NextResponse.json({ ok: true, watchers: 0, sent: 0 });

    const pairs = [...new Set(
      watchers.flatMap((w) => w.thresholds.filter((t) => !t.paused).map((t) => pairKey(t.base, t.quote)))
    )];
    const quotes = pairs.length ? await getRates(pairs) : [];
    const rateMap = new Map(quotes.map((q) => [q.pair, q.rate]));

    let sent = 0;
    for (const w of watchers) {
      const result = await checkAndNotify(w, rateMap);
      sent += result.sent;
      if (result.dead) await repo.remove(w.id);
      else if (result.dirty) { w.updatedAt = Date.now(); await repo.put(w); }
    }

    return NextResponse.json({ ok: true, watchers: watchers.length, pairs: pairs.length, sent });
  } catch (e: any) {
    console.error('cron check failed:', e?.message ?? e);
    return NextResponse.json({ ok: false, error: 'internal-error' }, { status: 500 });
  }
}
