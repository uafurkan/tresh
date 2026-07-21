import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Bricolage_Grotesque, Martian_Mono, Hanken_Grotesk } from 'next/font/google';
import { dictionaries, isLocale, localePath, locales, type Locale } from '@/lib/i18n';
import '../globals.css';

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

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : 'en';
  const m = dictionaries[locale].meta;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: m.title, template: '%s · Tresh' },
    description: m.description,
    alternates: {
      canonical: localePath(locale, '/'),
      languages: { en: '/', tr: '/tr', 'x-default': '/' },
    },
    manifest: '/manifest.webmanifest',
    openGraph: {
      type: 'website',
      locale: m.ogLocale,
      url: `${SITE_URL}${localePath(locale, '/')}`,
      siteName: 'Tresh',
      title: m.title,
      description: m.tagline,
    },
    twitter: {
      card: 'summary_large_image',
      title: m.title,
      description: m.tagline,
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: '#04090E',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Tresh',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    description: dictionaries[locale].meta.jsonLdDescription,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: `${SITE_URL}${localePath(locale, '/')}`,
  };
  return (
    <html lang={locale} className={`${heading.variable} ${mono.variable} ${body.variable}`}>
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
