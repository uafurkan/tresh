import { NextRequest, NextResponse } from 'next/server';
import { getRepository, watcherIdFromEndpoint, type PushSubscriptionJSON } from '@/lib/server/store';
import type { Threshold } from '@tresh/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  subscription: PushSubscriptionJSON;
  thresholds: Threshold[];
  locale?: string;
}

/** Aboneliği + kullanıcının eşiklerini kaydeder (upsert). Cron bunları tarar. */
export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-json' }, { status: 400 });
  }
  const sub = body?.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ ok: false, error: 'bad-subscription' }, { status: 400 });
  }
  const thresholds = (Array.isArray(body.thresholds) ? body.thresholds : [])
    .filter((t) => t && t.base && t.quote && Number.isFinite(t.value) && (t.dir === 'above' || t.dir === 'below'))
    .slice(0, 20);

  const repo = getRepository();
  const id = await watcherIdFromEndpoint(sub.endpoint);
  const existing = await repo.get(id);
  await repo.put({
    id,
    subscription: sub,
    thresholds,
    lastRates: existing?.lastRates ?? {},
    locale: body.locale === 'tr' ? 'tr' : 'en',
    updatedAt: Date.now(),
  });
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json().catch(() => ({ endpoint: null }));
  if (!endpoint) return NextResponse.json({ ok: false }, { status: 400 });
  const repo = getRepository();
  await repo.remove(await watcherIdFromEndpoint(endpoint));
  return NextResponse.json({ ok: true });
}
