# Backend Architecture

## Workspace

```text
apps/
  api/
    src/
      app.ts
      server.ts
      auth.ts
      config.ts
      errors.ts
      account-repository.ts
      catalog-repository.ts
      profile-repository.ts
      user-repository.ts
      workout-repository.ts
      session-repository.ts
      prisma-client.ts
      prisma-*-repository.ts
      readiness.ts
      supabase-client.ts
      routes/
        catalog.ts
        profile.ts
        users.ts
        workouts.ts
        sessions.ts

packages/
  contracts/
  domain/

supabase/
  config.toml
  migrations/
  seed.sql

prisma/
  schema.prisma

prisma.config.ts

docs/
scripts/
  openapi-check.ts
  test-db.sh
```

## Responsibilities

- `apps/api`: HTTP routes, request authentication, validation, response serialization, rate limiting, orchestration, and safe logging.
- `packages/contracts`: TypeBox request/response schemas and inferred TypeScript types. These schemas generate OpenAPI.
- `packages/domain`: Pure compatibility, recommendation, generation, and analytics functions. No Fastify or Supabase imports.
- `supabase`: Ordered migrations, grants, RLS, database functions, taxonomies, and reproducible seed data.
- `prisma`: Introspected typed model schema and Prisma Client generation target. It is not the owner of Supabase RLS, triggers, or RPC migrations.

## Request flow

```text
client
  -> Fastify route
  -> TypeBox validation
  -> auth/request context
  -> module service
  -> pure domain function when needed
  -> Prisma transaction with anon/authenticated Postgres role for table queries
  -> Postgres/RLS
```

The API verifies the bearer token once per request. Prisma table transactions set the
matching Postgres role and `request.jwt.claim.sub` before private queries, while the
request-scoped Supabase client carries the bearer token into auth-sensitive RPCs.
Public catalog reads use the `anon` Postgres role. The secret/service key is server-only
and is isolated to Auth-user deletion; there is no client-facing service-key path.

## Dependencies

- Node.js 24 LTS.
- Fastify 5.
- TypeScript in strict mode.
- TypeBox and Fastify's JSON Schema validation/serialization.
- `@fastify/swagger` and `@fastify/swagger-ui`.
- `@supabase/supabase-js` for Auth, Auth Admin deletion, and lifecycle RPCs.
- Prisma 7 with `@prisma/adapter-pg` and `pg` for typed PostgreSQL table access.
- Pino logging.
- Vitest.
- Biome.

Pin versions and commit the pnpm lockfile.

## Module boundaries

- `routes/users.ts`: profile, settings, and account deletion endpoints.
- `routes/profile.ts`: body-region, capability, equipment, and goal preferences.
- `routes/catalog.ts`: public taxonomies, exercise catalog, and compatibility preview.
- `routes/workouts.ts`: generation, manual creation, edits, and swaps.
- `routes/sessions.ts`: session state, metrics, completion, summaries, and progress.
- Repository adapters: memory implementations for unit/API tests, Prisma implementations
  for typed table queries, and Supabase implementations for the compatibility fallback
  and auth-sensitive RPCs.

Write operations that need atomicity use reviewed Postgres functions or a single transaction-safe operation. Route handlers must not contain compatibility or analytics algorithms.

## Authentication boundary

Supabase Auth handles signup, login, logout, and token refresh. The API exposes only application profile and data routes. Missing or invalid tokens return `401`; valid tokens never grant access outside the owner-scoped RLS policies.
