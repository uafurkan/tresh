# Contributing to Tresh

Thanks for your interest in improving Tresh.

Tresh is an MIT-licensed, self-hostable threshold-alert project for exchange rates and market prices. Contributions that improve reliability, provider resilience, notifications, accessibility, localization, documentation, or self-hosting are welcome.

## Before you start

- Open an issue first for large behavioral or architectural changes.
- Keep pull requests focused on one problem.
- Do not commit API keys, VAPID private keys, access tokens, or other credentials.
- Preserve the provider-fallback behavior: one unavailable data source should not take the whole rate pipeline down.
- Treat stale or unavailable market data explicitly rather than silently presenting it as fresh.

## Local development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The project can run without every optional integration configured. See the README for environment variables and deployment notes.

## Pull requests

A good pull request should include:

1. A short explanation of the problem being solved.
2. The smallest reasonable implementation.
3. Tests or reproducible verification when behavior changes.
4. Documentation updates when configuration or user-visible behavior changes.

Please avoid unrelated formatting or refactoring in the same pull request.

## Good contribution areas

Useful contribution areas include:

- rate-provider adapters and fallback behavior;
- stale-data and provider-failure handling;
- threshold evaluation and notification reliability;
- Web Push and background-check behavior;
- self-hosting and deployment documentation;
- accessibility and localization;
- test coverage and reproducible bug reports;
- extracting generally useful pieces into reusable packages.

## Reporting bugs

When possible, include:

- the affected currency/market pair;
- the expected and actual behavior;
- whether the issue is provider-specific;
- timestamps and provider/error details with secrets removed;
- reproduction steps.

## License

By contributing, you agree that your contributions will be licensed under the repository's MIT License.
