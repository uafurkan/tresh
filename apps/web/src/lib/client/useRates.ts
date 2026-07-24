'use client';

import { useEffect, useRef, useState } from 'react';

export interface LiveRate {
  rate: number;
  ts: number;
  source: string;
  /** Oturum açılışındaki ilk okuma — "bugün" deltası için referans. */
  opening: number;
}

const POLL_MS = 15_000;

/** Verilen pariteleri canlı takip eder; sekme gizliyken durur, hata durumunu bildirir. */
export function useRates(pairs: string[]) {
  const [rates, setRates] = useState<Record<string, LiveRate>>({});
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const ratesRef = useRef(rates);
  ratesRef.current = rates;
  const pairsKey = pairs.slice().sort().join(',');

  useEffect(() => {
    if (!pairsKey) {
      setLoading(false);
      return;
    }
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const res = await fetch(`/api/rates?pairs=${encodeURIComponent(pairsKey)}`, { cache: 'no-store' });
        const data = await res.json();
        if (stop) return;
        if (!data.ok) throw new Error('rates-unavailable');
        setRates((prev) => {
          const next = { ...prev };
          for (const q of data.quotes) {
            next[q.pair] = {
              rate: q.rate,
              ts: q.ts,
              source: q.source,
              opening: prev[q.pair]?.opening ?? q.rate,
            };
          }
          return next;
        });
        setError(false);
        setLoading(false);
      } catch {
        if (!stop) {
          setError(true);
          setLoading(false);
        }
      }
      if (!stop) timer = setTimeout(tick, document.hidden ? POLL_MS * 4 : POLL_MS);
    };

    tick();
    const onVisible = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pairsKey, nonce]);

  const retry = () => {
    setError(false);
    setLoading(true);
    setNonce((n) => n + 1);
  };

  return { rates, error, loading, retry };
}
