import { NextRequest, NextResponse } from 'next/server';
import { getRates } from '@/lib/server/rates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const pairsParam = req.nextUrl.searchParams.get('pairs') ?? 'USD/TRY';
  const pairs = [...new Set(pairsParam.split(',').map((p) => p.trim().toUpperCase()))].slice(0, 12);
  try {
    const quotes = await getRates(pairs);
    return NextResponse.json(
      { ok: true, quotes },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'rates-unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
