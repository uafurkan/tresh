import { NextRequest, NextResponse } from 'next/server';
import { sendPush, pushConfigured } from '@/lib/server/push';
import type { PushSubscriptionJSON } from '@/lib/server/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Kullanıcının push aboneliğinin gerçekten çalışıp çalışmadığını cron'u
 * beklemeden anında doğrulamak için — "Test bildirimi gönder" düğmesi.
 */
export async function POST(req: NextRequest) {
  let body: { subscription?: PushSubscriptionJSON; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-json' }, { status: 400 });
  }
  const sub = body?.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ ok: false, error: 'bad-subscription' }, { status: 400 });
  }
  if (!pushConfigured()) {
    return NextResponse.json({ ok: false, error: 'vapid-not-configured' }, { status: 503 });
  }
  const locale = body.locale === 'tr' ? 'tr' : 'en';
  const alive = await sendPush(sub, {
    title: locale === 'tr' ? 'Tresh · Test bildirimi' : 'Tresh · Test notification',
    body: locale === 'tr'
      ? 'Bunu görüyorsan push bildirimleri düzgün çalışıyor.'
      : "If you can see this, push notifications are working.",
    tag: 'tresh-manual-test',
    url: locale === 'tr' ? '/tr/app' : '/app',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  });
  return NextResponse.json({ ok: alive });
}
