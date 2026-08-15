# Backend Architecture

## Workspace

```text
apps/
  api/
    src/
      app.ts
      server.ts
      plugins/
        auth.ts
        errors.ts
        logging.ts
        rate-limit.ts
        supabase.ts
      modules/
        users/
        movement-profile/
        reference-data/
        exercises/
        workouts/
        sessions/
        progress/

packages/
  contracts/
  domain/

supabase/
  config.toml
  migrations/
  seed.sql

docs/
```

## Responsibilities

- `apps/api`: HTTP routes, request authentication, validation, response serialization, rate limiting, orchestration, and safe logging.
- `packages/contracts`: TypeBox request/response schemas and inferred TypeScript types. These schemas generate OpenAPI.
- `packages/domain`: Pure compatibility, recommendation, generation, and analytics functions. No Fastify or Supabase imports.
- `supabase`: Ordered migrations, grants, RLS, database functions, taxonomies, and reproducible seed data.

## Request flow

```text
client
  -> Fastify route
  -> TypeBox validation
  -> auth/request context
  -> module service
  -> pure domain function when needed
  -> user-scoped Supabase client
  -> Postgres/RLS
```

The API uses a request-scoped Supabase client carrying the user's bearer token. Public catalog reads use the publishable key. The secret/service key is server-only and limited to demo-user provisioning and Auth-user deletion.

## Dependencies

- Node.js 24 LTS.
- Fastify 5.
- TypeScript in strict mode.
- TypeBox and Fastify's JSON Schema validation/serialization.
- `@fastify/swagger` and `@fastify/swagger-ui`.
- `@supabase/supabase-js`.
- Pino logging.
- Vitest.
- Biome.

Pin versions and commit the pnpm lockfile.

## Module boundaries

- `users`: profile, settings, account deletion.
- `movement-profile`: body-region, capability, equipment, and goal preferences.
- `reference-data`: public taxonomies.
- `exercises`: catalog, sources, compatibility preview, and alternatives.
- `workouts`: generation, manual creation, edits, and swaps.
- `sessions`: session state, metrics, completion, and summaries.
- `progress`: history, daily activity, exercise trends, and body coverage.

Write operations that need atomicity use reviewed Postgres functions or a single transaction-safe operation. Route handlers must not contain compatibility or analytics algorithms.

## Authentication boundary

Supabase Auth handles signup, login, logout, and token refresh. The API exposes only application profile and data routes. Missing or invalid tokens return `401`; valid tokens never grant access outside the owner-scoped RLS policies.
