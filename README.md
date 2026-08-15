# PeddieHacks26

AdaptFit is a React Native adaptive fitness application for iOS and Android, designed for
disabled adults and people with temporary or chronic movement limitations. The
repository contains its Fastify API, shared TypeBox contracts, pure domain rules,
Prisma/Supabase/Postgres data layer, and an earlier web reference prototype.

## Workspace

- `apps/mobile`: primary React Native/Expo iOS and Android application target.
- `apps/web`: legacy reference prototype; it is not the primary product client.
- `apps/api`: Fastify service for profiles, compatibility, workouts, sessions, and
  progress.
- `packages/contracts`: public validation schemas and inferred TypeScript types.
- `packages/domain`: deterministic compatibility, generation, and analytics rules.
- `supabase`: migrations, RLS policies, database functions, and deterministic seed data.
- `prisma`: typed application models generated from the canonical Supabase schema.
- `model`: development-only local MediaPipe pose and arm-angle prototype.
- `docs`: product scope, architecture, API, privacy, deployment, testing, and roadmap.

## Mobile development status

Requirements are Node.js 24 through 26, pnpm 11.5.1, Expo-compatible iOS/Android tooling,
and Supabase credentials only when running the API or using live authentication.

The React Native workspace under `apps/mobile` is the implemented primary application. It
runs through Expo on an iOS simulator, Android emulator, or physical device. Guest mode
uses reviewed demo data and SQLite-backed device persistence, while live mode uses
Supabase Auth and the bearer-aware Fastify API. Do not use the legacy `apps/web`
prototype as the product runtime.

```bash
pnpm dev:mobile
pnpm dev:mobile:ios
pnpm dev:mobile:android
```

To run the API, provide the server values shown in `.env.example` through your shell or
deployment environment, then run:

```bash
pnpm dev:api
```

The API runs at `http://localhost:3000`. The mobile client uses
`EXPO_PUBLIC_API_BASE_URL` to reach it; physical devices must use a host address reachable
from the device rather than `localhost`.

For live mode, configure `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `EXPO_PUBLIC_API_BASE_URL`. Never put a
Supabase service-role key, database URL, or another server secret in an `EXPO_PUBLIC_`
variable.

## Camera and pose privacy

Camera permission is optional and requested by the native app only when the user chooses
tracking. The camera stream and pose processing stay on-device. Raw video, images, audio, and pose
landmarks are not sent to or stored by the API; only allowlisted derived metrics may be
uploaded. Guest feedback is explicitly labeled when simulated. Pose inference is a
mobile-client responsibility and is intentionally not a backend responsibility.

## Verification

```bash
pnpm install --frozen-lockfile
pnpm format
pnpm typecheck
pnpm test
pnpm test:integration
pnpm openapi:check
pnpm build
```

The recursive typecheck, test, and build commands cover both applications and the shared
packages. GitHub Actions additionally creates a disposable PostgreSQL 17 database,
applies all Supabase migrations and seed data, runs the SQL/RLS suite, and executes the
RLS-scoped Prisma smoke test on every push to `main` and every pull request. See
[the documentation index](docs/README.md) for the full architecture and acceptance
requirements.

The focused native component suite is `pnpm test:mobile`; the committed Maestro guest
flow is under `apps/mobile/.maestro` and requires the Maestro CLI plus a built app.
