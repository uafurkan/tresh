'use client';

import type { Threshold } from '@/lib/pairs';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

/** İzin ister, push aboneliği oluşturur ve eşiklerle birlikte sunucuya kaydeder. */
export async function enablePush(thresholds: Threshold[], locale = 'en'): Promise<boolean> {
  if (!pushSupported()) return false;
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) {
    console.warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY tanımsız — push devre dışı.');
    return false;
  }
  const reg = await registerServiceWorker();
  if (!reg) return false;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return false;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid) as unknown as BufferSource,
    }));
  return syncSubscription(sub, thresholds, locale);
}

/** Eşikler her değiştiğinde mevcut aboneliği sunucuyla eşitler. */
export async function syncThresholds(thresholds: Threshold[], locale = 'en'): Promise<void> {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await syncSubscription(sub, thresholds, locale);
}

async function syncSubscription(sub: PushSubscription, thresholds: Threshold[], locale: string): Promise<boolean> {
  try {
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), thresholds, locale }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
