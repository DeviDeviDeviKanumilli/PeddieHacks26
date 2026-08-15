# Implementation Roadmap

## Phase 1 — Documentation and scaffold

- Create this `docs/` set.
- Initialize pnpm workspace.
- Add `apps/api`, `packages/contracts`, and `packages/domain`.
- Add strict TypeScript, Biome, Vitest, and CI.

Exit criteria: workspace installs, typechecks, and runs a Fastify health route.

Status: complete. The pnpm workspace, strict TypeScript, Biome, Vitest, Fastify
health route, shared contracts, deterministic domain engines, 24-record domain
catalog, and GitHub CI workflow are committed and pushed.

## Phase 2 — Supabase foundation

- Initialize local Supabase configuration.
- Create ordered migrations.
- Add reference tables, users, profiles, and settings.
- Add exercise catalog tables.
- Add workout/session/metric tables.
- Add indexes, triggers, grants, and RLS.
- Add seed and catalog validation.

Exit criteria: `supabase db reset` succeeds from an empty local database and all RLS tests pass.

Status: schema, seed, RLS policies, grants, indexes, activation validation, session
deletion, account-deletion boundary, and disposable PostgreSQL checks are complete.
Docker-backed reset, advisor output, and hosted smoke testing remain environment-gated.

## Phase 3 — API foundation

- Implement environment validation.
- Implement auth/request context.
- Implement error envelope and request IDs.
- Implement public catalog/reference routes.
- Add rate limiting, CORS, logging redaction, health, and readiness.
- Generate OpenAPI from route schemas.

Exit criteria: authenticated and anonymous access boundaries work in integration tests.

Status: public catalog/reference routes, bearer-token request context, typed errors,
request IDs, OpenAPI output, rate limiting, readiness checks, compatibility lookup,
profile/settings routes, and all scoped authenticated resources are complete in the
repository-injected API. Supabase private repositories now receive the request bearer
token so hosted RLS is exercised with the real user identity.

## Phase 4 — Personalization and compatibility

- Implement profile/settings routes.
- Implement pure compatibility rules.
- Implement exercise compatibility responses.
- Implement deterministic ranking and alternatives.

Exit criteria: full compatibility matrix and equipment behavior are covered by tests.

Status: domain rules, persistence-backed movement/profile/settings routes,
compatibility responses, deterministic alternatives, atomic item replacement, and API
integration tests are complete for the current backend scope.

## Phase 5 — Workouts

- Implement workout generation.
- Implement manual workouts.
- Implement workout edits and swaps.
- Add optimistic concurrency and idempotent creates.

Exit criteria: generated workouts are duration-bounded and never contain hard conflicts.

Status: generated and manual workout creation, deterministic compatibility checks,
idempotent client request IDs, list/get, optimistic patching, archive behavior, and
workout-session creation are implemented and covered by API tests.

## Phase 6 — Sessions and analytics

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

## Phase 7 — Deletion, security, and deployment

- Implement session deletion and account deletion.
- Run Supabase advisors and resolve high-severity findings.
- Deploy migrations and the Railway API.
- Configure health checks and safe environment variables.
- Run hosted smoke tests and document rollback steps.

Exit criteria: hosted demo is reproducible, private data is isolated, and deletion is verified.

Status: retry-safe account deletion, dependency-aware readiness, environment guidance,
and Railway config-as-code are implemented. Hosted migration, advisor, and smoke-test
verification remain deployment-gated.

## Deferred

- Frontend implementation and design references.
- Platform-specific pose models.
- Clinician workflows.
- Admin catalog UI.
- Redis/distributed rate limiting.
- Raw media upload or storage.
- LLM coaching text.
