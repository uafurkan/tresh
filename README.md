# Tresh

Currency threshold-alert app. Pick a pair (e.g. USD/TRY) and a limit; get a push
notification the moment the live rate crosses it — even with the app closed.

> *"Tell me when it hits my number, I don't want to babysit charts."*

**Languages:** English is the default (`/`, `/app`); Turkish lives under `/tr`
(`/tr`, `/tr/app`). Locale routing is handled by `src/middleware.ts`, all UI
strings live in `src/lib/i18n.ts`, and push notifications are sent in the
subscriber's language.

## Architecture

- **Next.js 14 (App Router) + TypeScript + Tailwind** — SSG landing, client app at `/app`.
- **Canvas water engine** — `src/components/WaterCanvas.tsx`; a faithful port of the
  prototype's layered sine-wave engine. No chart library.
- **Live rates API** — `GET /api/rates?pairs=USD/TRY,EUR/USD`. Always up thanks to a
  provider chain: **Yahoo Finance** (keyless, near real-time) → **exchangerate.host**
  (if `RATES_API_KEY` is set) → **open.er-api.com** → **frankfurter.app**. If one source
  goes down, the next takes over; if all fail, the last reading is served marked stale.
  The client polls every 15 s; the server keeps a 10 s cache.
- **Web Push** — VAPID + `public/sw.js`. Subscription + thresholds (+ locale) are stored
  server-side via `POST /api/push/subscribe`.
- **Background checks** — `/api/cron/check` fetches rates, detects threshold crossings
  and sends push notifications (protected by `CRON_SECRET`). On Vercel **Pro** set the
  cron in `vercel.json` to `* * * * *`; on the **Hobby** plan Vercel crons are limited
  to daily, so keep the daily cron as a safety net and add a free external pinger
  (e.g. cron-job.org) that calls the endpoint every minute with an
  `Authorization: Bearer <CRON_SECRET>` header.
- **Repository abstraction** — subscriptions persist in Upstash Redis when its REST env
  vars are set, otherwise in memory (`src/lib/server/store.ts`). The client copy of
  thresholds lives in `localStorage` (`src/lib/client/storage.ts`) — the interfaces are
  stable for a later move to Supabase/Postgres.

## Setup

```bash
pnpm install          # or npm install
cp .env.example .env.local
npm run generate:vapid   # paste the generated keys into .env.local
pnpm dev              # http://localhost:3000
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | For push | Generate with `npm run generate:vapid` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | For push | Same value as the public key |
| `VAPID_SUBJECT` | No | `mailto:...` contact address |
| `RATES_API_KEY` | No | exchangerate.host key; the keyless chain works without it |
| `CRON_SECRET` | In production | Protects the cron route (Vercel sends `Authorization: Bearer` automatically) |
| `UPSTASH_REDIS_REST_URL` / `..._TOKEN` | Recommended in production | Persistent store for subscriptions |
| `NEXT_PUBLIC_SITE_URL` | No | Site URL for canonical/OG tags |

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fuafurkan%2Ftresh&env=VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY,NEXT_PUBLIC_VAPID_PUBLIC_KEY,CRON_SECRET&project-name=tresh)

1. Connect the repo to Vercel and enter the env vars in the dashboard.
2. The daily cron in `vercel.json` is set up automatically. For minute-level alerts on the Hobby plan, point cron-job.org (free) at `https://<your-domain>/api/cron/check` every minute with header `Authorization: Bearer <CRON_SECRET>`; on Pro, just change the schedule to `* * * * *`.
3. Add `UPSTASH_REDIS_REST_URL/TOKEN` for end-to-end push — the in-memory store is
   not shared across serverless instances.

## Prototype

The binding visual references live in `/prototype` (`Tresh.dc.html` mobile,
`TreshWeb.dc.html` web).

## License

MIT — see [LICENSE](LICENSE).
