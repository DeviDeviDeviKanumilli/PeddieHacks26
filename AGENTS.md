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

The repository currently contains the planning documents and the initial README. The next step is to scaffold the backend workspace, then implement contracts/domain logic, Supabase schema, API modules, session analytics, and the documented verification gates.
