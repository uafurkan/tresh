/**
 * Mobile app, web ile aynı backend'i (Vercel'deki /api/* rotaları) kullanır —
 * ayrı bir sunucu yazılmadı. Geliştirmede lokal Next.js dev server'a,
 * üretimde treshapp.vercel.app'e işaret eder.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://treshapp.vercel.app';
