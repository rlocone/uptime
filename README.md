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
