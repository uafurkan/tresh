import { NextRequest, NextResponse } from 'next/server';
import { sendPush, sendExpoPush, pushConfigured } from '@/lib/server/push';
import type { PushSubscriptionJSON } from '@/lib/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Kullanıcının push aboneliğinin gerçekten çalışıp çalışmadığını cron'u
 * beklemeden anında doğrulamak için — "Test bildirimi gönder" düğmesi.
 * Hem web (VAPID aboneliği) hem mobil (Expo push token) kabul eder.
 */
export async function POST(req: NextRequest) {
  let body: { subscription?: PushSubscriptionJSON; expoPushToken?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-json' }, { status: 400 });
  }

  const locale = body.locale === 'tr' ? 'tr' : 'en';
  const payload = {
    title: locale === 'tr' ? 'Tresh · Test bildirimi' : 'Tresh · Test notification',
    body: locale === 'tr'
      ? 'Bunu görüyorsan push bildirimleri düzgün çalışıyor.'
      : 'If you can see this, push notifications are working.',
    tag: 'tresh-manual-test',
    url: locale === 'tr' ? '/tr/app' : '/app',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  };

  // Mobil: Expo push servisi — VAPID yapılandırmasına ihtiyaç duymaz.
  if (body.expoPushToken) {
    const alive = await sendExpoPush(body.expoPushToken, payload);
    return NextResponse.json({ ok: alive });
  }

  const sub = body?.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ ok: false, error: 'bad-subscription' }, { status: 400 });
  }
  if (!pushConfigured()) {
    return NextResponse.json({ ok: false, error: 'vapid-not-configured' }, { status: 503 });
  }
  const alive = await sendPush(sub, payload);
  return NextResponse.json({ ok: alive });
}
