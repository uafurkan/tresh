import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { API_BASE_URL } from '../lib/config';

export interface LiveRate {
  rate: number;
  ts: number;
  source: string;
  /** Oturum açılışındaki ilk okuma — "bugün" deltası için referans. */
  opening: number;
}

const POLL_MS = 15_000;

/**
 * Web'deki useRates ile aynı mantık — tek fark, sekme görünürlüğü yerine
 * React Native AppState (active/background/inactive) kullanılıyor.
 */
export function useRates(pairs: string[]) {
  const [rates, setRates] = useState<Record<string, LiveRate>>({});
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const pairsKey = pairs.slice().sort().join(',');
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!pairsKey) {
      setLoading(false);
      return;
    }
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/rates?pairs=${encodeURIComponent(pairsKey)}`, { cache: 'no-store' } as RequestInit);
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
      if (!stop) {
        const backgrounded = appStateRef.current !== 'active';
        timer = setTimeout(tick, backgrounded ? POLL_MS * 4 : POLL_MS);
      }
    };

    tick();
    const sub = AppState.addEventListener('change', (next) => {
      const wasBackground = appStateRef.current !== 'active';
      appStateRef.current = next;
      if (next === 'active' && wasBackground) {
        clearTimeout(timer);
        tick();
      }
    });
    return () => {
      stop = true;
      clearTimeout(timer);
      sub.remove();
    };
  }, [pairsKey, nonce]);

  const retry = () => {
    setError(false);
    setLoading(true);
    setNonce((n) => n + 1);
  };

  return { rates, error, loading, retry };
}
