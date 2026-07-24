'use client';

import type { Threshold } from '@tresh/shared';

/**
 * Eşiklerin kalıcı deposu. İlk sürümde localStorage; arayüz sabit kaldığı
 * için ileride Supabase/Postgres'e geçiş yalnızca bu dosyayı değiştirir.
 */
export interface ThresholdRepository {
  load(): Threshold[];
  save(thresholds: Threshold[]): void;
}

const KEY = 'tresh:thresholds:v1';

export const localRepository: ThresholdRepository = {
  load() {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  },
  save(thresholds) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(thresholds));
    } catch {
      /* depolama dolu/kapalı — sessizce geç */
    }
  },
};
