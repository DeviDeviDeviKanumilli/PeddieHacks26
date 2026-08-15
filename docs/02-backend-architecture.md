# Application Architecture

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
  web/
    src/
      components/
      data/
      lib/
        api.ts
        supabase.ts
      screens/
      state/
      App.tsx
      main.tsx
    .env.example
    index.html
    vite.config.ts

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

- `apps/web`: Mobile-first React routes, screen composition, accessible interactions,
  local demo state, optional Supabase Auth, bearer-aware API requests, and browser camera
  lifecycle.
- `apps/api`: HTTP routes, request authentication, validation, response serialization, rate limiting, orchestration, and safe logging.
- `packages/contracts`: TypeBox request/response schemas and inferred TypeScript types. These schemas generate OpenAPI.
- `packages/domain`: Pure compatibility, recommendation, generation, and analytics functions. No Fastify or Supabase imports.
- `supabase`: Ordered migrations, grants, RLS, database functions, taxonomies, and reproducible seed data.
- `prisma`: Introspected typed model schema and Prisma Client generation target. It is not the owner of Supabase RLS, triggers, or RPC migrations.

## Runtime modes

The web client supports two explicit data paths:

```text
demo mode
  -> seeded exercise, history, and progress data
  -> React context and browser-local persistence
  -> no hosted dependency required

live mode
  -> Supabase Auth session
  -> bearer-aware API client
  -> Fastify validation and domain rules
  -> user-scoped Supabase client
  -> Postgres/RLS
```

Demo mode is the default when public Supabase client configuration is absent. Live mode
is selected when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are provided. The
live adapter hydrates the authenticated profile, reference catalog, compatibility,
movement profile, progress, and workout history from the API. Curated client presentation
content enriches API exercise summaries where the public contract does not yet expose
instructions or imagery. Live loading and failures are isolated from demo storage and
surface a recoverable boundary instead of silently showing seeded data.

## Live request flow

```text
React client
  -> Supabase Auth token
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

## Camera and metrics flow

```text
browser permission
  -> browser-local MediaStream preview
  -> optional future on-device pose inference
  -> allowlisted derived metrics
  -> Fastify metrics endpoint
  -> owner-scoped Postgres rows
```

The camera is optional and is started only after a user action. Tracks are stopped when
the flow ends or the client unmounts. Raw video, still images, audio, frame data, and pose
landmarks never enter an API request and are never persisted. The backend validates and
stores derived metrics only. It intentionally has no pose-estimation implementation. The
current automatic rep and score movement in demo mode is simulated client behavior, not
model output.

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
- React 19 and React DOM 19.
- React Router 7.
- Vite 8 and its React plugin.
- Testing Library with Vitest and jsdom for client behavior.

Pin versions and commit the pnpm lockfile.

## Module boundaries

- `apps/web/src/screens`: route-level onboarding, discovery, compatibility, camera,
  session, progress, and analysis UI.
- `apps/web/src/state`: demo/live mode selection, browser persistence, camera lifecycle,
  and UI session orchestration. Server business rules still belong in `packages/domain`.
- `apps/web/src/lib`: Supabase Auth configuration and the typed bearer-aware API client.
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

The web client calls Supabase Auth directly for signup, login, logout, and token refresh
when live configuration is present. It sends the resulting access token to the Fastify
API in the `Authorization` header. The API exposes only application profile and data
routes. Missing or invalid tokens return `401`; valid tokens never grant access outside
the owner-scoped RLS policies. Demo authentication is local UI state and must never be
treated as a production security boundary.
