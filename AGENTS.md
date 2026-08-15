# PeddieHacks26 Agent Instructions

## Scope

This repository is backend-only until the user provides frontend references. Do not add web, mobile, UI, styling, or iOS simulator work. Backend-facing contracts may be written for future clients, but client implementation is out of scope.

Read `docs/README.md` and the relevant numbered plan before changing behavior. Keep the implementation aligned with the decisions in `docs/01-scope-and-requirements.md` through `docs/10-implementation-roadmap.md`.

## Architecture rules

- Use Node.js/TypeScript/Fastify for the API.
- Keep validation and public types in `packages/contracts`.
- Keep compatibility, recommendation, generation, and analytics algorithms pure in `packages/domain`.
- Keep Supabase SQL under `supabase/migrations` and deterministic fixtures under `supabase/seed.sql`.
- Do not put business rules directly in route handlers.
- Never accept or persist raw video, images, audio, pose landmarks, or arbitrary user feedback text.
- Never use Supabase secret/service keys in client-facing code.

## Supabase rules

- Read the current Supabase skill guidance before schema, auth, RLS, or migration work.
- Use the Supabase CLI to create migration filenames; do not invent timestamps.
- Enable and force RLS on every exposed table.
- Add explicit grants alongside RLS policies.
- Use owner predicates with `(select auth.uid())`; update policies need both `USING` and `WITH CHECK`.
- Run database/security/performance verification after schema changes.
- Do not use destructive reset commands against a hosted environment.

## Verification

Before each commit, run the narrowest relevant checks and then the full checks when practical:

```text
pnpm format
pnpm typecheck
pnpm test
pnpm build
```

For database changes, also run local Supabase reset/migrations, seed validation, RLS tests, and advisors where available. Update the relevant docs in the same change whenever behavior, schema, API, safety, deployment, or testing expectations change.

## Git cadence

- Work in small slices that can be committed within 10 minutes.
- Commit every semimajor verified change with a specific message.
- Push each semimajor commit to `origin/main` after verification.
- Never commit secrets, local `.env` files, generated credentials, or real user data.
- Before pushing, confirm `git diff --check`, tests, current branch, and remote target.

## Current status

- Planning documents and the backend-only workspace scaffold are committed and pushed to `origin/main`.
- `@peddie/contracts` contains TypeBox schemas for movement profiles, compatibility, workout generation, errors, references, and pagination.
- `@peddie/domain` contains the deterministic `compatibility-v1` and `generation-v1` engines plus the 24-exercise catalog and tests.
- Supabase CLI configuration, seven ordered migrations, deterministic catalog seed, RLS isolation tests, and the atomic profile replacement RPC are now present. A disposable local PostgreSQL run passes them; Docker-backed `supabase db reset` remains to be run when Docker is available.
- The API now has typed error envelopes, request IDs, optional Supabase Auth verification, OpenAPI output, rate limiting, repository injection, public reference/exercise routes, authenticated compatibility lookup, movement-profile writes, workout generation, manual workouts, idempotency, optimistic edits, and archival.
- The API now also exposes authenticated `/v1/users/me` and `/v1/settings` reads/patches through memory and Supabase repository adapters; nested settings patches are merged and validated.
- `@peddie/domain` now also contains session state machines, derived-metric validation, exercise analysis, performance-change classification, and progress-baseline helpers; matching API schemas are in `@peddie/contracts`.
- Persistence-backed workout/exercise session state, metrics, analytics, progress, account/session deletion, dependency readiness checks, and Railway deployment wiring are still pending.
