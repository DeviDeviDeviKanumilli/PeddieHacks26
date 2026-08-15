# PeddieHacks26 Backend Plan

This folder is the backend source of truth for the adaptive fitness product.

The project is intentionally backend-only for this checkpoint. Frontend screens, styling, web/mobile architecture, and platform-specific camera implementation are deferred until references are provided.

## Reading order

1. [Scope and requirements](01-scope-and-requirements.md)
2. [Backend architecture](02-backend-architecture.md)
3. [Database schema](03-database-schema.md)
4. [API contract](04-api-contract.md)
5. [Compatibility and workout generation](05-compatibility-and-generation.md)
6. [Session metrics and analytics](06-session-metrics-and-analytics.md)
7. [Security, privacy, and safety](07-security-privacy-and-safety.md)
8. [Deployment and operations](08-deployment-and-operations.md)
9. [Testing and acceptance](09-testing-and-acceptance.md)
10. [Implementation roadmap](10-implementation-roadmap.md)
11. [Prisma migration boundary](11-prisma-migration.md)

## Locked decisions

- Backend only; no frontend work in this phase.
- Node.js 24 LTS, TypeScript, Fastify 5, and pnpm.
- Supabase Auth and Postgres; Fastify API deployed to Railway.
- Prisma 7 is the typed ORM for application table queries; Supabase SQL remains the source of truth for RLS, grants, triggers, and lifecycle RPCs.
- Local Supabase development plus one hosted demo environment.
- Email/password authentication plus a seeded demo account.
- Public exercise catalog; authentication required for personalization and history.
- Deterministic compatibility rules and scoring; no LLM in eligibility decisions.
- Pose estimation remains on-device. The API stores derived metrics only.
- Retain derived metrics until session or account deletion.
- Seed 24 sourced exercises, with tracking rules for 6.
- General wellness positioning for adults; no diagnosis, treatment, or rehabilitation claims.

## Current state

The backend workspace, Supabase schema, and Prisma data-access layer are implemented and pushed. `apps/api` is a
Fastify service with repository adapters, authenticated routes, OpenAPI output,
readiness checks, rate limiting, and memory-backed tests. `packages/contracts` owns
the TypeBox API boundary, while `packages/domain` owns pure compatibility, workout
generation, session-analysis, and progress rules.

The database currently has nine CLI-created migrations, deterministic catalog seed
data, explicit grants, forced RLS, owner-scoped policies, and transactional lifecycle
RPCs. Prisma table transactions establish the matching Postgres RLS role and JWT
subject; the request-scoped Supabase client remains for lifecycle RPCs and the
service-role client is isolated to account deletion. No frontend, iOS, camera, or
pose-model implementation belongs in this phase.

Repeatable checks are available through `pnpm format`, `pnpm typecheck`, `pnpm test`,
`pnpm build`, `pnpm openapi:check`, `pnpm test:integration`, and `pnpm test:db`.
When a database URL is available, `pnpm test:prisma` verifies RLS-scoped Prisma
catalog access as well.
`pnpm test:db` is environment-gated and runs the SQL suite when
`SUPABASE_DB_URL` or `DATABASE_URL` is set after migrations and seed data are applied.
