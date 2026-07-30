# uptime

Next.js + Prisma uptime tracker.

## Local development

```bash
cp .env.example .env
npm install --no-package-lock
npm run db:generate
npm run dev
```

## Database

```bash
npm run db:push
SEED_TEST_PASSWORD=... SEED_SAMPLE_PASSWORD=... npm run db:seed
npm run db:dedupe-hosts
```

## Docker

```bash
docker compose up --build
```

The container listens on port `3000`.

## Notes

- `middleware.ts` applies security headers.
- Hostnames are normalized to lowercase before storage to avoid duplicate rows.
- Report ingestion uses atomic host upserts to avoid racing duplicate host rows.
- Use `npm run db:dedupe-hosts` if the database already has duplicated host rows.
- Teams are an optional layer on top of hosts. A host can belong to zero or more teams.
- Combined totals reuse the same summary logic everywhere: the latest report per host is aggregated, current state is inferred from report recency, and 24h/7d/30d percentages reflect how many member hosts reported within each window.
