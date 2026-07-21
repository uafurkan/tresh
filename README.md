# Tresh

Döviz kuru eşik-alarm uygulaması. Bir parite (ör. USD/TRY) ve limit seç; canlı kur bu
limiti geçtiğinde — uygulama kapalı olsa bile — push bildirimi al.

> *"Sayım tutunca haber ver, grafiğe dadanmak istemiyorum."*

## Mimari

- **Next.js 14 (App Router) + TypeScript + Tailwind** — landing SSG, uygulama (`/app`) client.
- **Canvas su motoru** — `src/components/WaterCanvas.tsx`; prototipteki katmanlı sinüs
  dalga motorunun birebir taşınmış hali. Chart kütüphanesi yok.
- **Canlı kur API'si** — `GET /api/rates?pairs=USD/TRY,EUR/USD`. Sağlayıcı zinciri ile
  her zaman ayakta: **Yahoo Finance** (anahtarsız, anlık) → **exchangerate.host**
  (`RATES_API_KEY` verilirse) → **open.er-api.com** → **frankfurter.app**. Bir kaynak
  düşerse sıradaki devreye girer; hepsi düşerse son okuma "bayat" işaretiyle döner.
  İstemci 15 sn'de bir yoklar; sunucu tarafında 10 sn'lik önbellek vardır.
- **Web Push** — VAPID + `public/sw.js`. Abonelik + eşikler `POST /api/push/subscribe`
  ile sunucuya yazılır.
- **Vercel Cron** — `vercel.json` dakikada bir `/api/cron/check`'i çağırır: kurlar
  çekilir, eşik geçişleri tespit edilir, geçenlere arka planda push gönderilir
  (`CRON_SECRET` ile korunur).
- **Depo soyutlaması** — abonelikler Upstash Redis REST env'leri doluysa kalıcı,
  değilse bellek-içi tutulur (`src/lib/server/store.ts`). Eşiklerin istemci kopyası
  `localStorage`'dadır (`src/lib/client/storage.ts`) — ileride Supabase/Postgres'e
  geçiş için arayüzler sabittir.

## Kurulum

```bash
pnpm install          # veya npm install
cp .env.example .env.local
npm run generate:vapid   # çıkan anahtarları .env.local'e yapıştır
pnpm dev              # http://localhost:3000
```

## Ortam değişkenleri

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Push için | `npm run generate:vapid` ile üret |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push için | Public anahtarın aynısı |
| `VAPID_SUBJECT` | Hayır | `mailto:...` iletişim adresi |
| `RATES_API_KEY` | Hayır | exchangerate.host anahtarı; boşsa anahtarsız zincir çalışır |
| `CRON_SECRET` | Üretimde | Cron route'unu korur (Vercel otomatik `Authorization: Bearer` gönderir) |
| `UPSTASH_REDIS_REST_URL` / `..._TOKEN` | Üretimde önerilir | Aboneliklerin kalıcı deposu |
| `NEXT_PUBLIC_SITE_URL` | Hayır | Canonical/OG için site adresi |

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fuafurkan%2Ftresh&env=VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY,NEXT_PUBLIC_VAPID_PUBLIC_KEY,CRON_SECRET&project-name=tresh)

1. Repoyu Vercel'e bağla; env değişkenlerini dashboard'a gir.
2. `vercel.json`'daki cron otomatik kurulur (dakikada bir kontrol).
3. Push'un uçtan uca çalışması için `UPSTASH_REDIS_REST_URL/TOKEN` ekle — bellek-içi
   depo serverless instance'lar arasında paylaşılmaz.

## Prototip

Bağlayıcı görsel referanslar `/prototype` klasöründedir (`Tresh.dc.html` mobil,
`TreshWeb.dc.html` web).

## Lisans

MIT — bkz. [LICENSE](LICENSE).
