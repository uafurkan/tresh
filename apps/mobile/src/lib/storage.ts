import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Threshold } from '@tresh/shared';

/** Web'in localRepository'siyle aynı arayüz — sadece depolama katmanı (localStorage -> AsyncStorage) farklı. */
const KEY = 'tresh:thresholds:v1';

export async function loadThresholds(): Promise<Threshold[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveThresholds(thresholds: Threshold[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(thresholds));
  } catch {
    /* depolama dolu/erişilemez — sessizce geç */
  }
}
