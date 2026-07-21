import webpush from 'web-push';
import type { PushSubscriptionJSON } from './store';

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
