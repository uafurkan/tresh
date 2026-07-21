'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { localRepository } from '@/lib/client/storage';
import { useRates } from '@/lib/client/useRates';
import { tensionOf, miniWavePath } from '@/lib/client/wave';
import { PAIR_CATALOG, pairKey, type Threshold } from '@/lib/pairs';
import { dictionaries, localePath, type Locale } from '@/lib/i18n';

/** Ana sayfada, tarayıcıda zaten kayıtlı eşik varsa şık bir önizlemesini gösterir. */
export default function WatchlistPreview({ locale }: { locale: Locale }) {
  const d = dictionaries[locale].landing;
  const [thresholds, setThresholds] = useState<Threshold[] | null>(null);

  useEffect(() => {
    setThresholds(localRepository.load());
  }, []);

  const pairs = (thresholds ?? []).map((t) => pairKey(t.base, t.quote));
  const { rates } = useRates(pairs);

  if (!thresholds || thresholds.length === 0) return null;

  return (
    <div className="rise-in mb-10">
      <div className="mb-3 flex items-center justify-between px-0.5">
        <span className="text-[11px] uppercase tracking-[1.5px] text-content-secondary">{d.watchlistTitle}</span>
        <Link href={localePath(locale, '/app')} className="text-[12px] text-water hover:opacity-80">
          {d.watchlistManage} →
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {thresholds.slice(0, 6).map((t) => {
          const key = pairKey(t.base, t.quote);
          const cat = PAIR_CATALOG.find((p) => p.base === t.base && p.quote === t.quote);
          const live = rates[key]?.rate;
          const tens = live != null && cat ? tensionOf(live, t.value, cat.span) : 0;
          const dull = [46, 164, 160], vivid = [56, 231, 217];
          const color = `rgb(${dull.map((c, i) => Math.round(c + (vivid[i] - c) * tens)).join(',')})`;
          const lvl = live != null && cat ? Math.max(0, Math.min(1, (live - (t.value - cat.span / 2)) / cat.span)) : 0.5;
          return (
            <Link
              key={t.id}
              href={localePath(locale, '/app')}
              className="flex flex-none flex-col gap-2 rounded-2xl border p-3.5 transition-transform hover:-translate-y-0.5"
              style={{
                minWidth: 148,
                background: 'rgba(11,22,34,0.55)',
                borderColor: t.paused ? 'rgba(143,165,179,0.14)' : 'rgba(52,227,214,0.22)',
                backdropFilter: 'blur(8px)',
                opacity: t.paused ? 0.55 : 1,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="num text-[13px] tracking-wide text-content-primary">{key}</span>
                <span className="num text-[13px]" style={{ color }}>{live?.toFixed(t.decimals) ?? '—'}</span>
              </div>
              <svg width="100%" height="22" viewBox="0 0 120 22" preserveAspectRatio="none" className="overflow-visible">
                <path d={miniWavePath(lvl, 120, 22)} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span className="text-[11px] text-content-secondary">
                {t.dir === 'above' ? '↑' : '↓'} {t.value.toFixed(t.decimals)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
