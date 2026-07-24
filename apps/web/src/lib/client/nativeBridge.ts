'use client';

import type { Threshold } from '@tresh/shared';

/**
 * iOS native sarmalayıcı köprüsü.
 *
 * Site normal Safari'de açıldığında bu fonksiyonlar hiçbir şey yapmaz
 * (window.webkit.messageHandlers.tresh yoktur). Ama site, `ios/` klasöründeki
 * native WKWebView sarmalayıcı içinde açıldığında, en üstteki takibi + canlı
 * kuru native tarafa gönderir; native taraf da bunu Dynamic Island'daki
 * Live Activity'de gösterir.
 */

interface TreshMessageHandler {
  postMessage: (msg: unknown) => void;
}

function handler(): TreshMessageHandler | null {
  const w = window as unknown as {
    webkit?: { messageHandlers?: { tresh?: TreshMessageHandler } };
  };
  return w.webkit?.messageHandlers?.tresh ?? null;
}

export function isNativeWrapper(): boolean {
  return typeof window !== 'undefined' && handler() != null;
}

export interface NativeTopWatch {
  pair: string;
  value: number;
  dir: 'above' | 'below';
  decimals: number;
  rate: number | null;
}

/** En üstteki takibi native tarafa gönderir (Dynamic Island bunu gösterir). */
export function pushTopWatch(watch: NativeTopWatch | null): void {
  const h = handler();
  if (!h) return;
  try {
    h.postMessage({ type: 'topWatch', watch });
  } catch { /* köprü kapalı */ }
}

/** Kullanıcının takip listesini native tarafa aktarır (arka planda kur çekimi için). */
export function pushWatchList(thresholds: Threshold[]): void {
  const h = handler();
  if (!h) return;
  try {
    h.postMessage({
      type: 'watchList',
      watches: thresholds.map((t) => ({
        id: t.id,
        pair: `${t.base}/${t.quote}`,
        value: t.value,
        dir: t.dir,
        decimals: t.decimals,
        paused: t.paused,
      })),
    });
  } catch { /* köprü kapalı */ }
}
