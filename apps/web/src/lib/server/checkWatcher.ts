import type { Watcher } from './store';
import { sendPush } from './push';
import { pairKey, pushBody } from '@tresh/shared';

const OPEN_ACTION_LABEL: Record<string, string> = { en: 'Open Tresh', tr: 'Tresh’i aç' };

export interface CheckResult {
  sent: number;
  dirty: boolean;
  dead: boolean;
}

/**
 * Tek bir izleyicinin eşiklerini verilen kur haritasına göre kontrol eder,
 * geçenlere push gönderir. Hem cron (tüm izleyiciler) hem de "şimdi kontrol
 * et" (tek izleyici, anlık) tarafından paylaşılır — mantık iki kopya halinde
 * tutulmasın diye.
 */
export async function checkAndNotify(w: Watcher, rateMap: Map<string, number>): Promise<CheckResult> {
  let sent = 0;
  let dirty = false;
  let dead = false;
  const locale = w.locale === 'tr' ? 'tr' : 'en';
  const url = locale === 'tr' ? '/tr/app' : '/app';

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
        const arrow = t.dir === 'above' ? '▲' : '▼';
        const alive = await sendPush(w.subscription, {
          title: `Tresh · ${key} ${arrow}`,
          body: pushBody(locale, key, t.value.toFixed(t.decimals), t.dir, rate.toFixed(t.decimals), t.decimals),
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

  return { sent, dirty, dead };
}
