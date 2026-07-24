import type { Metadata } from 'next';
import { dictionaries, localePath, type Locale } from '@tresh/shared';
import TreshApp from './TreshApp';

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  const m = dictionaries[params.locale]?.meta ?? dictionaries.en.meta;
  return {
    title: m.titleApp,
    description: m.descriptionApp,
    alternates: {
      canonical: localePath(params.locale, '/app'),
      languages: { en: '/app', tr: '/tr/app', 'x-default': '/app' },
    },
  };
}

export default function AppPage({ params }: { params: { locale: Locale } }) {
  return <TreshApp locale={params.locale} />;
}
