import webpush from 'web-push';
import type { PushSubscriptionJSON, Watcher } from './store';

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:notify@tresh.app', pub, priv);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  /** İkon (192x192 önerilir) — tüm platformlarda kullanılır. */
  icon?: string;
  /** Bildirim köşesindeki küçük rozet (Android/Chrome). */
  badge?: string;
  /** Büyük banner görseli — yalnızca Android/Chrome destekler, diğerleri yoksayar. */
  image?: string;
  /** Bildirim eylem düğmeleri — yalnızca Chrome/Edge/Android destekler. */
  actions?: { action: string; title: string }[];
  /** Kullanıcı kapatana kadar ekranda kalsın mı (yalnızca destekleyen platformlar). */
  requireInteraction?: boolean;
}

/** VAPID anahtarları Vercel env'inde tanımlı mı — teşhis amaçlı. */
export function pushConfigured(): boolean {
  return ensureConfigured();
}

/** Bildirimi gönderir; abonelik ölmüşse (404/410) false döner. */
export async function sendPush(sub: PushSubscriptionJSON, payload: PushPayload): Promise<boolean> {
  if (!ensureConfigured()) {
    console.warn('VAPID keys missing — push skipped');
    return true;
  }
  try {
    await webpush.sendNotification(sub as any, JSON.stringify(payload), { TTL: 300 });
    return true;
  } catch (e: any) {
    if (e?.statusCode === 404 || e?.statusCode === 410) return false;
    console.error('push send failed:', e?.statusCode ?? e);
    return true;
  }
}

/**
 * Mobil (iOS/Android) uygulaması için Expo'nun push servisi kullanılır —
 * APNs/FCM sertifika yönetimini Expo üstlenir, biz yalnızca Expo push
 * token'ına HTTPS isteği atarız. Anahtar/sertifika gerektirmez.
 */
export async function sendExpoPush(token: string, payload: PushPayload): Promise<boolean> {
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: token,
        title: payload.title,
        body: payload.body,
        data: { url: payload.url, tag: payload.tag },
        sound: 'default',
      }),
    });
    const data = await res.json().catch(() => null);
    const ticket = data?.data;
    // Expo, ölü/geçersiz token'lar için DeviceNotRegistered hatası döner —
    // web push'taki 404/410 ile aynı anlamda: aboneliği sil.
    if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') return false;
    if (!res.ok) console.error('expo push send failed:', res.status);
    return true;
  } catch (e) {
    console.error('expo push send failed:', e);
    return true;
  }
}

/** Watcher'ın türüne (web/mobil) göre doğru gönderim yolunu seçer. */
export async function sendPushToWatcher(w: Watcher, payload: PushPayload): Promise<boolean> {
  if (w.expoPushToken) return sendExpoPush(w.expoPushToken, payload);
  if (w.subscription) return sendPush(w.subscription, payload);
  return true;
}
