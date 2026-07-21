import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/server/store';
import { getRates } from '@/lib/server/rates';
import { sendPush } from '@/lib/server/push';
import { pairKey, TEST_SAMPLES } from '@/lib/pairs';
import { pushBody } from '@/lib/i18n';

const OPEN_ACTION_LABEL: Record<string, string> = { en: 'Open Tresh', tr: 'Tresh’i aç' };

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

  const repo = getRepository();
  const watchers = await repo.getAll();
  if (watchers.length === 0) return NextResponse.json({ ok: true, watchers: 0, sent: 0 });

  // TEST/DEMO gerçek bir kur değil — bildirim testleri için ayrı işlenir,
  // sağlayıcılardan veri çekilmez.
  const pairs = [...new Set(
    watchers.flatMap((w) => w.thresholds.filter((t) => !t.paused && t.base !== 'TEST').map((t) => pairKey(t.base, t.quote)))
  )];
  const quotes = pairs.length ? await getRates(pairs) : [];
  const rateMap = new Map(quotes.map((q) => [q.pair, q.rate]));

  let sent = 0;
  for (const w of watchers) {
    let dirty = false;
    let dead = false;
    const locale = w.locale === 'tr' ? 'tr' : 'en';
    const url = locale === 'tr' ? '/tr/app' : '/app';
    for (const t of w.thresholds) {
      if (t.paused) continue;

      // ---- Test paritesi: her cron çalışmasında garanti tetiklenir, her
      // seferinde farklı bir örnek kur/format ile — zengin bildirimin tüm
      // cihazlarda (Mac/iOS/Windows/Linux) nasıl göründüğünü hızlıca
      // doğrulamak için. Gerçek geçiş mantığına girmez.
      if (t.base === 'TEST') {
        const counter = (w.lastRates[t.id] ?? -1) + 1;
        const sample = TEST_SAMPLES[counter % TEST_SAMPLES.length];
        const arrow = sample.dir === 'above' ? '▲' : '▼';
        const alive = await sendPush(w.subscription, {
          title: `Tresh · ${sample.key} ${arrow}`,
          body: pushBody(locale, sample.key, sample.value.toFixed(sample.decimals), sample.dir, sample.rate.toFixed(sample.decimals)),
          tag: `tresh-test-${t.id}-${counter}`,
          url,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          actions: [{ action: 'open', title: OPEN_ACTION_LABEL[locale] }],
        });
        if (!alive) { dead = true; break; }
        sent++;
        w.lastRates[t.id] = counter;
        dirty = true;
        continue;
      }

      const key = pairKey(t.base, t.quote);
      const rate = rateMap.get(key);
      if (rate == null) continue;
      const prev = w.lastRates[t.id];
      if (prev != null) {
        const crossed = t.dir === 'above'
          ? prev < t.value && rate >= t.value
          : prev > t.value && rate <= t.value;
        if (crossed) {
          const arrow = t.dir === 'above' ? '▲' : '▼';
          const alive = await sendPush(w.subscription, {
            title: `Tresh · ${key} ${arrow}`,
            body: pushBody(locale, key, t.value.toFixed(t.decimals), t.dir, rate.toFixed(t.decimals)),
            tag: `tresh-${t.id}`,
            url,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            actions: [{ action: 'open', title: OPEN_ACTION_LABEL[locale] }],
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
