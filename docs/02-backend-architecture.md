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
  mobile/
    src/
      components/
      data/
      lib/
        api.ts
        supabase.ts
        guestWorkout.ts
        sessionFlow.ts
        sessionSync.ts
        tracking/
      app/
      state/
        useAppStore.ts
    modules/
      adaptfit-pose/
    app.json
    eas.json

  web/ # legacy reference prototype; not the product target

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

- `apps/mobile`: React Native/Expo routes, native screen composition, accessible
  interactions, local guest state, optional Supabase Auth, bearer-aware API requests,
  and device camera lifecycle.
- `apps/web`: Legacy reference prototype retained for historical implementation context.
- `apps/api`: HTTP routes, request authentication, validation, response serialization, rate limiting, orchestration, and safe logging.
- `packages/contracts`: TypeBox request/response schemas and inferred TypeScript types. These schemas generate OpenAPI.
- `packages/domain`: Pure compatibility, recommendation, generation, and analytics functions. No Fastify or Supabase imports.
- `supabase`: Ordered migrations, grants, RLS, database functions, taxonomies, and reproducible seed data.
- `prisma`: Introspected typed model schema and Prisma Client generation target. It is not the owner of Supabase RLS, triggers, or RPC migrations.

## Mobile Presentation Boundaries

The mobile client owns presentation choices that do not belong in the API or database:

- `AppHeader` is rendered on Home, Workout, Progress, and Profile. Explore starts with its
  discovery title and search field so the tab does not repeat the global header.
- Explore's **For me**, **All exercises**, and collection routes compose the reviewed catalog
  with deterministic client filters. The API remains the source of truth for exercise content,
  compatibility, and requirements.
- `MovementMark` is a code-native category mark for compact exercise and collection rows. It
  uses Lucide vectors and a shared color registry; it is not an exercise image, a muscle map,
  or a server-stored media asset.
- `AnatomyMap` is the reusable interactive front/back SVG for movement constraints and muscle
  emphasis. The mobile client maps canonical API muscle attributes into it and keeps a text
  equivalent for accessibility.
- Progress range selection is presentation state, but its UTC bounds are passed unchanged to
  the live `/v1/progress/activity` request. Guest mode applies those same bounds locally.

## Runtime Modes

The React Native mobile client supports two explicit data paths:

```text
guest mode
  -> seeded exercise, history, and progress data
  -> native application state and device-local persistence
  -> no hosted dependency required

live mode
  -> Supabase Auth session
  -> bearer-aware API client
  -> Fastify validation and domain rules
  -> user-scoped Supabase client
  -> Postgres/RLS
```

Guest mode is always available. Live mode is enabled when
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are provided. The
live adapter hydrates the authenticated profile, reference catalog, compatibility,
movement profile, progress, and workout history from the API. Curated client presentation
media is used only where reviewed assets exist; exercise instructions, safety cues,
adaptations, muscles, and requirements come from the public API. Live loading and failures are isolated from guest storage and
surface a recoverable boundary instead of silently showing seeded data.

The Workout tab recommended plan is built on-device by `buildGuestWorkout` in both guest
and live modes. `mobileApi.generateWorkout` exists on the client, but current screens do
not call `POST /v1/workouts/generate`. Live session sync (`startLiveSession`,
`resumeLiveExercise`, `completeLiveSession`, `finishLiveWorkout`) runs only when the
workout id is a UUID or a `workoutSessionId` is already present. The local recommended
plan uses `guest-workout-1`, so those starts stay on-device unless a hosted workout id is
supplied. The API generation and session routes remain implemented for hosted smoke and
the legacy web prototype.

## Live Request Flow

```text
React Native client
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

## Camera and Metrics Flow

```text
native camera permission
  -> on-device camera preview
  -> optional on-device pose inference
  -> allowlisted derived metrics
  -> Fastify metrics endpoint
  -> owner-scoped Postgres rows
```

The camera is optional and is started only after a user action. The camera session is
released when the flow ends, the app backgrounds, or the component unmounts. Raw video,
still images, audio, frame data, and pose
landmarks never enter an API request and are never persisted. The backend validates and
stores derived metrics only. It intentionally has no pose-estimation implementation. Guest
Expo Go still uses a labeled simulated timer; Android development builds count from
on-device angles. The Python prototype under `model/` is a desktop calibration lab; the
mobile runtime is the native module in `apps/mobile/modules/adaptfit-pose`. See
[On-Device Pose Integration](13-react-native-mobile.md#on-device-pose-integration).

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
- React Native and Expo.
- Expo Router for native stack, tab, modal, and deep-link navigation.
- React Native Testing Library for component behavior.
- Maestro for iOS and Android end-to-end acceptance.

Pin versions and commit the pnpm lockfile.

## Module Boundaries

- `apps/mobile/app`: route-level onboarding, discovery, compatibility, camera,
  session, progress, and analysis UI.
- `apps/mobile/src/state`: guest/live mode selection, device persistence, camera lifecycle,
  and UI session orchestration. `updateWorkoutItem` patches sets, reps, and rest on the
  local recommended plan. Server business rules still belong in `packages/domain`.
- `apps/mobile/src/lib`: Supabase Auth configuration, the typed bearer-aware API client,
  the local recommended planner (`guestWorkout.ts`), session query helpers
  (`sessionFlow.ts`), live session lifecycle (`sessionSync.ts`), and on-device tracking.
- `routes/users.ts`: profile, settings, and account deletion endpoints.
- `routes/profile.ts`: body-region, capability, equipment, and goal preferences.
- `routes/catalog.ts`: public taxonomies, exercise catalog, and compatibility preview.
- `routes/workouts.ts`: generation, manual creation, edits, and swaps.
- `routes/sessions.ts`: session state, metrics, completion, summaries, and progress.
- Repository adapters: memory implementations for unit/API tests, Prisma implementations
  for typed table queries, and Supabase implementations for the compatibility fallback
  and auth-sensitive RPCs.

Write operations that need atomicity use reviewed Postgres functions or a single transaction-safe operation. Route handlers must not contain compatibility or analytics algorithms.

## Authentication Boundary

The mobile client calls Supabase Auth directly for signup, login, logout, and token refresh
when live configuration is present. It sends the resulting access token to the Fastify
API in the `Authorization` header. The API exposes only application profile and data
routes. Missing or invalid tokens return `401`; valid tokens never grant access outside
the owner-scoped RLS policies. Guest authentication is local UI state and must never be
treated as a production security boundary.
