# Prisma Migration Boundary

## Decision

The backend now uses Prisma 7 as its typed ORM for application table queries. This
improves compile-time field selection, relation loading, pagination, JSON mapping,
and transaction composition without replacing Supabase Auth or the security-critical
SQL already in the repository.

The database has two complementary owners:

| Concern | Source of truth |
| --- | --- |
| Tables, columns, foreign keys, checks, indexes | `supabase/migrations` |
| Grants, forced RLS, policies, triggers, Auth hook | `supabase/migrations` |
| Atomic profile/session/workout lifecycle functions | `supabase/migrations` |
| Typed application queries and relation reads | Prisma repositories |
| Auth token verification and Auth Admin deletion | Supabase Auth / `supabase-js` |
| Seed catalog | `supabase/seed.sql` |

This is intentional. Prisma introspection reports RLS and check constraints, but
Prisma migrations cannot recreate the project-specific security and PL/pgSQL
objects safely.

## Runtime flow

1. Fastify verifies the Supabase bearer token and records `userId` on the request.
2. A Prisma repository opens an interactive transaction for private table access.
3. The transaction sets `request.jwt.claim.sub` and `request.jwt.claim.role`.
4. It changes the local Postgres role to `authenticated` for a user query or `anon`
   for a public catalog query.
5. Prisma executes typed model queries while forced RLS remains enabled.
6. Session lifecycle RPCs still use the request-scoped Supabase client so their
   existing `auth.uid()` checks and row locks remain unchanged.

The application still includes explicit `user_id` filters even though RLS is enabled.
Those filters make ownership intent visible in repository code and protect against
accidental broad reads if a query is later moved to a privileged maintenance path.

## Connection variables

- `DATABASE_URL`: runtime connection string used by `@prisma/adapter-pg`; prefer a
  pooled URL for Railway.
- `DIRECT_URL`: direct Postgres connection used by Prisma CLI introspection and
  schema verification.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY`: Auth verification, public client fallback,
  and request-scoped RPC calls.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Auth Admin account deletion.

Never put a service-role key in `DATABASE_URL`, a mobile app, browser code, or seed
data. Do not log any of these values.

## Schema update workflow

1. Add or modify database objects in a new ordered `supabase/migrations/*.sql` file.
2. Apply/reset the database with the Supabase CLI in local development.
3. Run `DIRECT_URL=... pnpm exec prisma db pull`.
4. Review the generated `prisma/schema.prisma` diff for unexpected tables, relations,
   or Auth objects.
5. Run `pnpm prisma:generate`, typecheck, tests, and `pnpm test:prisma`.
6. Commit the SQL migration and the reviewed Prisma schema together.

Do not use `prisma db push`, `prisma migrate reset`, or Prisma-generated migrations
against the Supabase project. Those commands do not know how to preserve the RLS,
grants, triggers, Auth schema, or lifecycle functions in this application.

## Rollback

If a Prisma repository regression is discovered, deploy the previous API commit or
temporarily select the Supabase repository fallback after confirming it is still
supported for that release. Do not roll back the database by deleting Prisma
migration history. Database changes are rolled forward through reviewed Supabase
SQL migrations.

## Current repository coverage

- Prisma: catalog/reference data, movement profiles, user profiles/settings, readiness,
  workout CRUD, idempotency, owner-scoped session history, and progress reads.
- Supabase RPCs: session creation/transitions, metric-batch ingestion, exercise/workout
  completion, session deletion, atomic movement-profile replacement fallback, and
  atomic workout-item replacement fallback.
- Supabase Auth: bearer verification and retry-safe account deletion.

The split can be narrowed later, but only after equivalent transaction, RLS, locking,
and concurrency tests exist for each RPC replacement.
