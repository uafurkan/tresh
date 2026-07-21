'use client';

export interface NotifLogEntry {
  id: string;
  title: string;
  body: string;
  ts: number;
  url?: string;
}

const LS_KEY = 'tresh:notifLog';
const SW_CACHE = 'tresh-notif-log';
const SW_CACHE_KEY = '/notif-log';
const MAX_ENTRIES = 60;

function readLocal(): NotifLogEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeLocal(entries: NotifLogEntry[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES))); } catch { /* yoksay */ }
}

async function readSwCache(): Promise<NotifLogEntry[]> {
  try {
    if (!('caches' in window)) return [];
    const cache = await caches.open(SW_CACHE);
    const res = await cache.match(SW_CACHE_KEY);
    return res ? await res.json() : [];
  } catch { return []; }
}

function merge(a: NotifLogEntry[], b: NotifLogEntry[]): NotifLogEntry[] {
  const byId = new Map<string, NotifLogEntry>();
  for (const e of [...a, ...b]) byId.set(e.id, e);
  return [...byId.values()].sort((x, y) => y.ts - x.ts).slice(0, MAX_ENTRIES);
}

/** Hem uygulama açıkken oluşan (localStorage) hem de push ile gelen
 * (service worker'ın yazdığı Cache API girdisi) bildirimleri birleştirir. */
export async function readNotifLog(): Promise<NotifLogEntry[]> {
  const [local, sw] = await Promise.all([Promise.resolve(readLocal()), readSwCache()]);
  const combined = merge(local, sw);
  writeLocal(combined);
  return combined;
}

/** Uygulama açıkken (client tarafında tespit edilen) bir geçişi log'a ekler. */
export function logNotifLocal(entry: Omit<NotifLogEntry, 'id'>) {
  const withId: NotifLogEntry = { ...entry, id: `local-${entry.ts}-${Math.random().toString(36).slice(2, 8)}` };
  writeLocal(merge(readLocal(), [withId]));
}

export async function clearNotifLog(): Promise<void> {
  writeLocal([]);
  try {
    const cache = await caches.open(SW_CACHE);
    await cache.put(SW_CACHE_KEY, new Response(JSON.stringify([])));
  } catch { /* yoksay */ }
  try { navigator.serviceWorker?.controller?.postMessage('notif-log-clear'); } catch { /* yoksay */ }
}
