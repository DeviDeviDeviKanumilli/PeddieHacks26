# PeddieHacks26

Backend for an adaptive general-wellness fitness product for disabled adults and
people with temporary or chronic movement limitations.

The repository currently contains the Fastify API, shared TypeBox contracts,
deterministic compatibility/analytics engines, Prisma data access, and the Supabase
schema, seed, RLS policies, and lifecycle functions. Frontend and pose-estimation
implementations are intentionally deferred.

Start with the [backend documentation](docs/README.md).

## Verification

```bash
pnpm install --frozen-lockfile
pnpm format
pnpm typecheck
pnpm test
pnpm openapi:check
pnpm build
```

GitHub Actions additionally creates a disposable PostgreSQL 17 database, applies all
Supabase migrations and seed data, runs the SQL/RLS suite, and executes the
RLS-scoped Prisma smoke test on every push to `main` and every pull request.
