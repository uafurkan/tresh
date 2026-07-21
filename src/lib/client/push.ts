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

export type EnablePushResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'missing-vapid' | 'denied' | 'dismissed' | 'subscribe-failed' | 'sync-failed' };

/**
 * İzin ister, push aboneliği oluşturur ve eşiklerle birlikte sunucuya kaydeder.
 *
 * Notification.requestPermission() burada, herhangi bir await'ten ÖNCE çağrılır:
 * araya bir await girerse (ör. önce service worker register edilirse) bazı
 * tarayıcılar (özellikle Safari/iOS) tıklamanın "kullanıcı hareketi" bağlamını
 * kaybeder ve izin diyaloğunu hiç göstermeden sessizce reddeder.
 */
export async function enablePush(thresholds: Threshold[], locale = 'en'): Promise<EnablePushResult> {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) {
    console.warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY tanımsız — Vercel env değişkenlerini kontrol edip yeniden deploy et.');
    return { ok: false, reason: 'missing-vapid' };
  }

  if (Notification.permission === 'denied') return { ok: false, reason: 'denied' };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, reason: perm === 'denied' ? 'denied' : 'dismissed' };

  const reg = await registerServiceWorker();
  if (!reg) return { ok: false, reason: 'subscribe-failed' };
  let sub: PushSubscription | null;
  try {
    sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as unknown as BufferSource,
      }));
  } catch {
    return { ok: false, reason: 'subscribe-failed' };
  }
  if (!sub) return { ok: false, reason: 'subscribe-failed' };
  const synced = await syncSubscription(sub, thresholds, locale);
  return synced ? { ok: true } : { ok: false, reason: 'sync-failed' };
}

/** Eşikler her değiştiğinde mevcut aboneliği sunucuyla eşitler. */
export async function syncThresholds(thresholds: Threshold[], locale = 'en'): Promise<void> {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await syncSubscription(sub, thresholds, locale);
}

export type TestPushResult = { ok: true } | { ok: false; reason: 'not-enabled' | 'no-subscription' | 'vapid-not-configured' | 'send-failed' | 'network' };

/** Cron'u beklemeden aboneliğin gerçekten çalışıp çalışmadığını anında dener. */
export async function sendTestPush(locale = 'en'): Promise<TestPushResult> {
  if (!pushSupported() || Notification.permission !== 'granted') return { ok: false, reason: 'not-enabled' };
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return { ok: false, reason: 'no-subscription' };
  try {
    const res = await fetch('/api/push/test-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), locale }),
    });
    if (res.status === 503) return { ok: false, reason: 'vapid-not-configured' };
    const data = await res.json().catch(() => ({ ok: false }));
    return data.ok ? { ok: true } : { ok: false, reason: 'send-failed' };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

export type CheckNowResult = { ok: true; sent: number } | { ok: false; reason: 'not-enabled' | 'no-subscription' | 'not-subscribed' | 'network' };

/** Cron'un tetiklenmesini beklemeden, kullanıcının kendi eşiklerini (ör. TEST/DEMO) anında kontrol ettirir. */
export async function checkNow(): Promise<CheckNowResult> {
  if (!pushSupported() || Notification.permission !== 'granted') return { ok: false, reason: 'not-enabled' };
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return { ok: false, reason: 'no-subscription' };
  try {
    const res = await fetch('/api/push/check-now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    if (res.status === 404) return { ok: false, reason: 'not-subscribed' };
    const data = await res.json().catch(() => ({ ok: false }));
    return data.ok ? { ok: true, sent: data.sent ?? 0 } : { ok: false, reason: 'network' };
  } catch {
    return { ok: false, reason: 'network' };
  }
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
