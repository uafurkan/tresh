import { ImageResponse } from 'next/og';
import { dictionaries, isLocale } from '@/lib/i18n';

export const runtime = 'edge';
export const alt = 'Tresh — currency threshold alerts';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage({ params }: { params: { locale: string } }) {
  const locale = isLocale(params.locale) ? params.locale : 'en';
  const tagline = dictionaries[locale].meta.tagline;
  const wave = Array.from({ length: 61 }, (_, i) => {
    const x = i * 20;
    const y = 400 + Math.sin(i * 0.35) * 14 + Math.sin(i * 0.8) * 6;
    return `${i === 0 ? 'M' : 'L'}${x},${y.toFixed(1)}`;
  }).join(' ');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#04090E',
          position: 'relative',
        }}
      >
        <svg width="1200" height="630" style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <linearGradient id="w" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(52,227,214,0.45)" />
              <stop offset="100%" stopColor="rgba(6,16,26,0.9)" />
            </linearGradient>
          </defs>
          <path d={`${wave} L1200,630 L0,630 Z`} fill="url(#w)" />
          <path d={wave} stroke="#34E3D6" strokeWidth="3" fill="none" />
          <line x1="0" y1="330" x2="1200" y2="330" stroke="rgba(232,241,245,0.4)" strokeWidth="2" strokeDasharray="4 12" />
        </svg>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '80px 90px',
            color: '#E8F1F5',
          }}
        >
          <div style={{ fontSize: 72, fontWeight: 700 }}>Tresh</div>
          <div style={{ fontSize: 34, color: '#8FA5B3', marginTop: 18, maxWidth: 700 }}>{tagline}</div>
        </div>
      </div>
    ),
    size
  );
}
