# Tresh

**Tresh is an open-source, self-hostable threshold-alert app for exchange rates and market prices.** Pick a pair (for example USD/TRY, BTC/USD, or XAU/USD), choose a level, and get a push notification when the live rate crosses it — without continuously watching a chart.

> *"Tell me when it hits my number, I don't want to babysit charts."*

Tresh is designed as both a usable application and a small open-source foundation for reliable rate monitoring: provider fallback, stale-data handling, threshold evaluation, Web Push, localization, and self-hosted deployment.

**Languages:** English is the default (`/`, `/app`); Turkish lives under `/tr` (`/tr`, `/tr/app`). Push notifications follow the subscriber's language.

## Why Tresh

Many market-alert tools are closed services. Tresh aims to keep the core workflow understandable and self-hostable:

- define a market threshold;
- obtain a rate through a resilient provider chain;
- make stale/unavailable data explicit;
- evaluate crossings in the background;
- deliver a push notification;
- keep deployment simple enough for an individual developer to operate.

The long-term open-source direction is to make the provider abstraction, threshold engine, and notification logic increasingly reusable outside the main application.

## Architecture

- **Next.js + TypeScript + Tailwind** — web application and server-side rate/notification endpoints.
- **Shared market-pair logic** — reusable pair definitions and threshold behavior across the project.
- **Live rates API** — rate retrieval uses multiple sources with fallback behavior. If one source is unavailable, another can take over; if fresh data cannot be obtained, stale state is surfaced rather than silently treated as current.
- **Web Push** — VAPID-based browser notifications.
- **Background checks** — a protected cron endpoint evaluates threshold crossings and sends notifications.
- **Repository abstraction** — subscriptions can use persistent backing storage while the interfaces stay isolated from the UI.
- **Mobile work** — the repository also contains mobile-facing application work sharing the same product model.

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Depending on the workspace/package you are running, the repository scripts may expose more specific web or mobile commands. See `package.json` and workspace package scripts for the current commands.

## Environment variables

Common deployment variables include:

| Variable | Required | Description |
|---|---|---|
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | For push | VAPID credentials for Web Push |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | For push | Browser-visible VAPID public key |
| `VAPID_SUBJECT` | No | Contact subject, usually `mailto:...` |
| `RATES_API_KEY` | Provider-dependent | Optional key for configured rate providers |
| `CRON_SECRET` | In production | Protects the background-check endpoint |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Recommended in production | Persistent subscription/threshold storage |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical public site URL |

Never commit production credentials.

## Self-hosting

Tresh is intended to be deployable by other developers rather than tied to a single hosted instance.

For a typical deployment:

1. Fork or clone the repository.
2. Configure the required environment variables.
3. Deploy the web application to a compatible Next.js host.
4. Configure persistent storage for subscriptions/thresholds.
5. Schedule the protected background-check endpoint at the interval appropriate for your deployment.
6. Configure VAPID keys if you want Web Push.

Provider availability and host cron limits vary, so deployments should keep fallback and stale-data behavior enabled rather than assuming every external service is continuously available.

## Contributing

Contributions are welcome, especially around:

- provider adapters and fallback reliability;
- stale-data and failure-state handling;
- threshold evaluation;
- notification reliability;
- accessibility and localization;
- tests and reproducible bug reports;
- self-hosting documentation;
- extracting reusable open-source packages.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Open-source roadmap

Near-term maintenance priorities include:

- stronger automated coverage for provider and threshold edge cases;
- clearer provider-health and stale-data diagnostics;
- improved self-hosting documentation;
- contributor-friendly issues and examples;
- separating generally useful provider/threshold logic into reusable packages where that improves the public API.

## License

Tresh is released under the [MIT License](LICENSE).
