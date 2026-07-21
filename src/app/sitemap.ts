import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tresh.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
      alternates: { languages: { en: SITE_URL, tr: `${SITE_URL}/tr` } },
    },
    {
      url: `${SITE_URL}/app`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: { languages: { en: `${SITE_URL}/app`, tr: `${SITE_URL}/tr/app` } },
    },
    { url: `${SITE_URL}/tr`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/tr/app`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];
}
