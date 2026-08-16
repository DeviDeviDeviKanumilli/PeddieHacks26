# AdaptFit Agent Instructions

## Scope

AdaptFit is a React Native mobile application for iOS and Android. The primary client
belongs in `apps/mobile`; the Fastify API and its existing contracts remain the source of
truth for server behavior. The existing `apps/web` code is a legacy reference prototype,
not the product target. Do not expand or redesign it unless the user explicitly requests
legacy-web work.

Read `docs/README.md`, `docs/13-react-native-mobile.md`, and the relevant numbered
specification before changing behavior. Keep implementation aligned with the mobile
product decisions across the complete `docs/` set.

## Architecture Rules

- Use Node.js/TypeScript/Fastify for the API.
- Keep validation and public types in `packages/contracts`.
- Keep compatibility, recommendation, generation, and analytics algorithms pure in `packages/domain`.
- Keep Supabase SQL under `supabase/migrations` and deterministic fixtures under `supabase/seed.sql`.
- Do not put business rules directly in route handlers.
- Build the product client with React Native and Expo for iOS and Android under
  `apps/mobile`, with a usable guest adapter alongside optional Supabase Auth and Fastify
  API live mode.
- Keep camera access optional and on-device. Client code may send only allowlisted
  derived metrics, never raw media or pose landmarks.
- Never accept or persist raw video, images, audio, pose landmarks, or arbitrary user feedback text.
- Never use Supabase secret/service keys in client-facing code.

## Supabase Rules

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

## Git Cadence

- Work in small slices that can be committed within 10 minutes.
- Commit every semimajor verified change with a specific message.
- Push each semimajor commit to `origin/main` after verification.
- Never commit secrets, local `.env` files, generated credentials, or real user data.
- Before pushing, confirm `git diff --check`, tests, current branch, and remote target.

## Current Status

- The React Native product client lives under `apps/mobile`: guest mode, optional
  Supabase Auth and Fastify live mode, onboarding, discovery, workouts, camera-optional
  sessions, analysis, progress, profile, and account deletion.
- Android on-device pose is in the repository (`apps/mobile/modules/adaptfit-pose` plus
  session complete/analysis/live-upload wiring). Expo Go cannot run it. The next pose
  step is `pnpm dev:mobile:android:device` on the physical Android phone, then biceps-curl
  calibration. Do not train a new pose network. iOS still uses `expo-camera` preview.
- `@peddie/web` is a legacy reference prototype containing earlier onboarding,
  discovery, compatibility, camera, session, history, progress, and analysis work. It
  must not be treated as the primary application architecture.
- `@peddie/contracts` contains TypeBox schemas for movement profiles, compatibility, workout generation, errors, references, and pagination.
- `@peddie/domain` contains the deterministic `compatibility-v1` and `generation-v1` engines plus the 24-exercise catalog and tests.
- Supabase CLI configuration, nine ordered migrations, deterministic catalog seed, RLS isolation tests, atomic profile/item replacement RPCs, and transactional session lifecycle RPCs are now present. A disposable local PostgreSQL run passes them; Docker-backed `supabase db reset` and advisors remain to be run when the environment supports them.
- The API now has typed error envelopes, request IDs, optional Supabase Auth verification, OpenAPI output, rate limiting, repository injection, public reference/exercise routes, authenticated compatibility lookup, movement-profile writes, workout generation, manual workouts, idempotency, optimistic edits, and archival.
- The API now also exposes authenticated `/v1/users/me` and `/v1/settings` reads/patches through memory and Supabase repository adapters; nested settings patches are merged and validated.
- `@peddie/domain` now also contains session state machines, derived-metric validation, exercise analysis, performance-change classification, and progress-baseline helpers; matching API schemas are in `@peddie/contracts`.
- The API now also exposes workout/exercise session lifecycle, derived metric batches, analysis, activity/progress, and owner-scoped session deletion through memory and Supabase repositories. Session completion and daily-progress rebuilds use transactional Supabase functions; raw pose/media fields are rejected.
- Authenticated Supabase repositories now propagate each request's bearer token into a request-scoped client so hosted RLS evaluates the real user. Account deletion uses a server-only service-role adapter with retry-safe handling, `/readyz` performs a bounded Supabase dependency check, `railway.toml` contains backend deployment wiring, and `.github/workflows/ci.yml` runs the repeatable gates. Hosted migrations/advisors and smoke tests remain environment-gated.
- Mobile camera access is opt-in and raw media remains on-device. Production pose
  inference belongs in the React Native client; the backend intentionally does not
  perform pose inference.
