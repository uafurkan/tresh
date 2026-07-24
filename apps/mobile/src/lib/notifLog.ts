import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotifLogEntry {
  id: string;
  title: string;
  body: string;
  ts: number;
}

const KEY = 'tresh:notif-log:v1';
const MAX = 60;

export async function readNotifLog(): Promise<NotifLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function logNotifLocal(entry: NotifLogEntry): Promise<void> {
  try {
    const existing = await readNotifLog();
    const next = [entry, ...existing].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* sessizce geç */
  }
}

export async function clearNotifLog(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify([]));
  } catch {
    /* sessizce geç */
  }
}
