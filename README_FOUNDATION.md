# NAAMIVE repository foundation

This workspace is the technical result of `WI-001` and contains only the
reproducible foundation for the first vertical slice. It deliberately contains
no business, authentication, RBAC, or lifecycle behavior.

Use Node `24.21.0` and pnpm `12.3.4`:

```bash
corepack pnpm install --frozen-lockfile
pnpm typecheck
pnpm architecture
pnpm test
pnpm build
```

For a real local PostgreSQL 18.6 bootstrap:

```bash
docker compose -f deploy/compose/compose.dev.yaml up -d
DATABASE_URL=postgres://postgres@127.0.0.1:54329/naamive pnpm db:integration
```

Migrations are explicit (`pnpm db:migrate`) and never run at application
startup. The development compose service intentionally uses local trust
authentication; deployable environments must inject non-versioned credentials.
