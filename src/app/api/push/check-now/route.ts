import { NextRequest, NextResponse } from 'next/server';
import { getRepository, watcherIdFromEndpoint, type PushSubscriptionJSON } from '@/lib/server/store';
import { getRates } from '@/lib/server/rates';
import { checkAndNotify } from '@/lib/server/checkWatcher';
import { pairKey } from '@/lib/pairs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Cron-job.org'un gerçek tetikleme sıklığından bağımsız olarak, kullanıcının
 * KENDİ eşiklerini anında kontrol edip (ör. TEST/DEMO paritesi için) push
 * göndermeyi dener — "cron çalışıyor mu, yoksa push mu bozuk" ayrımını
 * saniyeler içinde yapabilmek için.
 */
export async function POST(req: NextRequest) {
  let body: { subscription?: PushSubscriptionJSON };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-json' }, { status: 400 });
  }
  const sub = body?.subscription;
  if (!sub?.endpoint) {
    return NextResponse.json({ ok: false, error: 'bad-subscription' }, { status: 400 });
  }

  try {
    const repo = getRepository();
    const id = await watcherIdFromEndpoint(sub.endpoint);
    const watcher = await repo.get(id);
    if (!watcher) return NextResponse.json({ ok: false, error: 'not-subscribed' }, { status: 404 });

    const pairs = [...new Set(
      watcher.thresholds.filter((t) => !t.paused && t.base !== 'TEST').map((t) => pairKey(t.base, t.quote))
    )];
    const quotes = pairs.length ? await getRates(pairs) : [];
    const rateMap = new Map(quotes.map((q) => [q.pair, q.rate]));

    const result = await checkAndNotify(watcher, rateMap);
    if (result.dead) await repo.remove(watcher.id);
    else if (result.dirty) { watcher.updatedAt = Date.now(); await repo.put(watcher); }

    return NextResponse.json({ ok: true, sent: result.sent });
  } catch (e: any) {
    console.error('check-now failed:', e?.message ?? e);
    return NextResponse.json({ ok: false, error: 'internal-error' }, { status: 500 });
  }
}
