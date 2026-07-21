import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Martian_Mono, Hanken_Grotesk } from 'next/font/google';
import './globals.css';

const heading = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
});
const mono = Martian_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
  display: 'swap',
});
const body = Hanken_Grotesk({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tresh.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Tresh — Döviz eşik alarmı',
    template: '%s · Tresh',
  },
  description:
    'Bir parite ve limit seç; canlı kur limitini geçtiğinde — uygulama kapalı olsa bile — bildirim al. Sayım tutunca haber ver, grafiğe dadanmak istemiyorum.',
  alternates: { canonical: '/' },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: SITE_URL,
    siteName: 'Tresh',
    title: 'Tresh — Döviz eşik alarmı',
    description: 'Sayım tutunca haber ver, grafiğe dadanmak istemiyorum.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tresh — Döviz eşik alarmı',
    description: 'Sayım tutunca haber ver, grafiğe dadanmak istemiyorum.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#04090E',
  width: 'device-width',
  initialScale: 1,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Tresh',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  description: 'Döviz kuru eşik-alarm uygulaması. Kur, belirlediğin seviyeyi geçince push bildirimi alırsın.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: SITE_URL,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${heading.variable} ${mono.variable} ${body.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
