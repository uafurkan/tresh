import { NextRequest, NextResponse } from 'next/server';
import { getRepository, watcherIdFromEndpoint, watcherIdFromExpoToken, type PushSubscriptionJSON } from '@/lib/server/store';
import type { Threshold } from '@tresh/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  /** Web Push (tarayıcı/PWA) — subscription VEYA expoPushToken'dan biri gelir, ikisi birden değil. */
  subscription?: PushSubscriptionJSON;
  /** Mobil (iOS/Android) uygulaması. */
  expoPushToken?: string;
  thresholds: Threshold[];
  locale?: string;
}

/** Aboneliği (web veya mobil) + kullanıcının eşiklerini kaydeder (upsert). Cron bunları tarar. */
export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-json' }, { status: 400 });
  }

  const sub = body?.subscription;
  const expoPushToken = body?.expoPushToken;
  const isWebSub = !!(sub?.endpoint && sub?.keys?.p256dh && sub?.keys?.auth);
  const isExpoSub = typeof expoPushToken === 'string' && expoPushToken.length > 0;
  if (!isWebSub && !isExpoSub) {
    return NextResponse.json({ ok: false, error: 'bad-subscription' }, { status: 400 });
  }

  const thresholds = (Array.isArray(body.thresholds) ? body.thresholds : [])
    .filter((t) => t && t.base && t.quote && Number.isFinite(t.value) && (t.dir === 'above' || t.dir === 'below'))
    .slice(0, 20);

  const repo = getRepository();
  const id = isWebSub ? await watcherIdFromEndpoint(sub!.endpoint) : await watcherIdFromExpoToken(expoPushToken!);
  const existing = await repo.get(id);
  await repo.put({
    id,
    subscription: isWebSub ? sub : undefined,
    expoPushToken: isExpoSub ? expoPushToken : undefined,
    thresholds,
    lastRates: existing?.lastRates ?? {},
    locale: body.locale === 'tr' ? 'tr' : 'en',
    updatedAt: Date.now(),
  });
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  const { endpoint, expoPushToken } = await req.json().catch(() => ({ endpoint: null, expoPushToken: null }));
  const repo = getRepository();
  if (endpoint) {
    await repo.remove(await watcherIdFromEndpoint(endpoint));
    return NextResponse.json({ ok: true });
  }
  if (expoPushToken) {
    await repo.remove(await watcherIdFromExpoToken(expoPushToken));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 400 });
}
