# Implementation Roadmap

## Phase 1 - Documentation and scaffold

- Create this `docs/` set.
- Initialize pnpm workspace.
- Add `apps/api`, `packages/contracts`, and `packages/domain`.
- Add strict TypeScript, Biome, Vitest, and CI.

Exit criteria: workspace installs, typechecks, and runs a Fastify health route.

Status: complete. The pnpm workspace, strict TypeScript, Biome, Vitest, Fastify
health route, shared contracts, deterministic domain engines, 24-record domain
catalog, and GitHub CI workflow are committed and pushed.

## Phase 2 - Supabase foundation

- Initialize local Supabase configuration.
- Create ordered migrations.
- Add reference tables, users, profiles, and settings.
- Add exercise catalog tables.
- Add workout/session/metric tables.
- Add indexes, triggers, grants, and RLS.
- Add seed and catalog validation.

Exit criteria: `supabase db reset` succeeds from an empty local database and all RLS tests pass.

Status: schema, seed, RLS policies, grants, indexes, activation validation, session
deletion, account-deletion boundary, and mandatory disposable PostgreSQL CI checks are
complete. Docker-backed reset, advisor output, and hosted smoke execution remain
environment-gated.

## Phase 3 - API foundation

- Implement environment validation.
- Implement auth/request context.
- Implement error envelope and request IDs.
- Implement public catalog/reference routes.
- Add rate limiting, CORS, logging redaction, health, and readiness.
- Generate OpenAPI from route schemas.

Exit criteria: authenticated and anonymous access boundaries work in integration tests.

Status: public catalog/reference routes, bearer-token request context, typed errors,
request IDs, OpenAPI output, route-specific rate limiting, redacted structured logs,
readiness checks, compatibility lookup,
profile/settings routes, and all scoped authenticated resources are complete in the
repository-injected API. Supabase private repositories now receive the request bearer
token so hosted RLS is exercised with the real user identity.

## Phase 4 - Personalization and compatibility

- Implement profile/settings routes.
- Implement pure compatibility rules.
- Implement exercise compatibility responses.
- Implement deterministic ranking and alternatives.

Exit criteria: full compatibility matrix and equipment behavior are covered by tests.

Status: domain rules, persistence-backed movement/profile/settings routes,
compatibility responses, deterministic alternatives, atomic item replacement, and API
integration tests are complete for the current backend scope.

## Phase 5 - Workouts

- Implement workout generation.
- Implement manual workouts.
- Implement workout edits and swaps.
- Add optimistic concurrency and idempotent creates.

Exit criteria: generated workouts are duration-bounded and never contain hard conflicts.

Status: generated and manual workout creation, deterministic compatibility checks,
idempotent client request IDs, list/get, optimistic patching, archive behavior, and
workout-session creation are implemented and covered by API tests.

## Phase 6 - Sessions and analytics

- Implement workout and exercise state machines.
- Implement metric batch ingestion and deduplication.
- Implement exercise completion summaries.
- Implement workout completion and daily progress.
- Implement history, trends, and body coverage.

Exit criteria: hosted demo acceptance passes with a complete tracked session.

Status: pure state-machine, metric-validation, analytics, and progress-baseline
helpers, contract schemas, memory/Supabase repositories, transactional lifecycle
functions, derived metric ingestion, completion summaries, history, and progress API
routes are complete. Hosted verification and deletion smoke tests remain.

## Phase 7 - Deletion, security, and deployment

- Implement session deletion and account deletion.
- Run Supabase advisors and resolve high-severity findings.
- Deploy migrations and the Railway API.
- Configure health checks and safe environment variables.
- Run hosted smoke tests and document rollback steps.

Exit criteria: hosted demo is reproducible, private data is isolated, and deletion is verified.

Status: missing-identity-tolerant account deletion, dependency-aware readiness, environment guidance,
Railway config-as-code, mandatory clean-database CI, and a guarded hosted smoke runner
are implemented. Hosted migration, advisor, load, and smoke-test execution remain
deployment-gated.

## Phase 8 — Prisma ORM migration

- Add Prisma 7 with the PostgreSQL driver adapter and generated client.
- Introspect the existing public schema without replacing Supabase migrations.
- Move catalog, profile/settings, workout, readiness, session-history, and progress
  table access to typed Prisma repositories.
- Establish Postgres `anon`/`authenticated` roles and JWT subject claims inside Prisma
  transactions so forced RLS continues to enforce ownership.
- Keep Supabase Auth, Auth Admin deletion, and lifecycle RPCs on `supabase-js`.
- Add Prisma generation, smoke checks, build/CI gates, and deployment documentation.

Exit criteria: clean checkout generation/build, RLS-scoped Prisma smoke check, existing
SQL security suite, API tests, and OpenAPI checks all pass.

Status: complete for the current backend scope. The deliberate Supabase RPC boundary
remains documented in [the Prisma migration boundary](11-prisma-migration.md).

## Phase 8 - Legacy reference prototype

- Preserve the earlier reference prototype under `apps/web` as historical implementation
  material; it is not the product target.
- Implement the supplied mobile-first onboarding, discovery, exercise, compatibility,
  movement-profile, camera, guided-session, history, progress, and analysis screens.
- Provide a deterministic demo adapter that works without hosted dependencies.
- Add optional live Supabase Auth and bearer-aware Fastify API configuration.
- Keep camera permission optional, provide no-tracking paths, and keep raw media and pose
  landmarks inside its local runtime.
- Retain its existing tests while the native client is built.

Status: complete as a legacy prototype. It does not satisfy the React Native mobile
application requirement.

## Phase 9 - React Native iOS and Android application

- Add the Expo/React Native application under `apps/mobile`.
- Implement native onboarding, five-tab navigation, discovery, exercise details,
  compatibility, workout building, camera setup, guided sessions, analysis, progress,
  history, profile management, guest mode, and Supabase-authenticated live mode.
- Keep camera data on-device and provide a no-camera path for every workout.
- Add iOS and Android component, accessibility, lifecycle, privacy, and end-to-end tests.
- Configure development, preview, and production mobile builds.

Exit criteria: the complete reference flow runs as a native iOS and Android application,
works in guest and authenticated modes, adapts recommendations to movement constraints,
handles camera denial, and sends only allowlisted derived metrics to the API.

Status: the executable mobile milestone is complete. `apps/mobile` now contains the
native onboarding and five-tab experience, searchable body-map equivalent, adaptive
discovery, reviewed exercise detail, generated workout review, camera permission and
no-camera paths, active/rest/completion/analysis flows, local guest persistence,
Supabase email authentication, movement/settings synchronization, derived count-only
session uploads, live progress reads, and account deletion. Jest/React Native Testing
Library coverage, a Maestro guest flow, EAS profiles, CI configuration checks, iOS and
Android exports, and an iOS simulator lifecycle pass are present.

The production pose-estimation native module, signed preview/store builds, Android
emulator acceptance, hosted credentials, hosted migration/advisor execution, and final
network inspection remain environment- or model-delivery-gated. See
[the React Native mobile plan](13-react-native-mobile.md).

## Deferred

- Desktop-first replacement UI or further product development in `apps/web`.
- Training a new pose model; mobile integration and calibration are part of Phase 9.
- Clinician workflows.
- Admin catalog UI.
- Redis/distributed rate limiting.
- Raw media upload or storage.
- LLM coaching text.
