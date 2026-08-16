# AdaptFit

AdaptFit is a general-wellness fitness application for disabled adults and people with temporary
or chronic movement limitations. It turns a saved movement profile into compatible exercise
discovery, generated or manual workouts, camera-optional guided sessions, and non-clinical
progress history. It does not diagnose, treat, or provide rehabilitation.

The product client is the React Native / Expo application in `apps/mobile` (iOS and Android).
`apps/web` is a legacy reference prototype and is not the product target.

Architecture, privacy, API, and acceptance requirements are in the
[AdaptFit Product and Engineering Specifications](docs/README.md).

## Workspace

- `apps/mobile`: primary React Native/Expo client for iOS and Android.
- `apps/web`: legacy web reference prototype; do not treat it as the product runtime.
- `apps/api`: Fastify 5 service for profiles, compatibility, workouts, sessions, and progress.
- `packages/contracts` (`@peddie/contracts`): TypeBox request/response schemas and public types.
- `packages/domain` (`@peddie/domain`): deterministic `compatibility-v1`, `generation-v1`, and
  analytics rules. No Fastify or Supabase imports.
- `supabase`: migrations, RLS policies, lifecycle RPCs, and deterministic catalog seed data.
- `prisma`: typed application models generated from the canonical Supabase schema.
- `model`: desktop MediaPipe calibration lab. It is not the mobile runtime.
- `docs`: [AdaptFit Product and Engineering Specifications](docs/README.md).

## Architecture

The mobile client has two modes:

- **Guest mode** uses reviewed demo data and SQLite on the device. It runs without API or
  Supabase credentials.
- **Live mode** uses Supabase Auth (publishable key only) and the bearer-aware Fastify API
  when `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
  `EXPO_PUBLIC_API_BASE_URL` are set.

Route handlers in `apps/api` validate, authenticate, and orchestrate. Business rules live in
`@peddie/domain`. Authenticated Supabase access evaluates hosted RLS with the caller's bearer
token. Account deletion is the only path that uses a server-only service-role adapter.

## Camera and Privacy

Camera permission is optional and requested only when the user chooses tracking. The camera
stream and pose processing stay on-device. Raw video, images, audio, and pose landmarks are
never sent to or stored by the API; only allowlisted derived metrics may be uploaded.

On-device pose uses MediaPipe Pose Landmarker in `apps/mobile/modules/adaptfit-pose` on
Android development builds (`pnpm dev:mobile:android:device`). Expo Go cannot load that
module. The first calibrated exercise is seated biceps curl. iOS currently uses an
`expo-camera` preview and does not ship the native pose path. Guest Expo Go sessions use a
labeled timer when the module is absent. Pose inference is a mobile-client responsibility;
the backend does not perform it.

## Requirements

- Node.js 24 through 26 and pnpm 11.5.1
- Expo-compatible iOS and/or Android tooling
- Values from `.env.example` to run the API
- Values from `apps/mobile/.env.example` only for live mode (guest mode works without them)

## Run

```bash
pnpm install --frozen-lockfile

pnpm dev:mobile
pnpm dev:mobile:ios
pnpm dev:mobile:android
```

On-device Android pose requires a development build on a physical device, not Expo Go:

```bash
pnpm dev:mobile:android:device
```

To run the API, provide the server values in `.env.example`, then:

```bash
pnpm dev:api
```

The API listens at `http://localhost:3000`. Physical devices cannot reach the laptop through
`localhost`; set `EXPO_PUBLIC_API_BASE_URL` to a LAN IP (and bind `HOST=0.0.0.0` on the API)
or to a hosted origin.

Never put a Supabase service-role key, database URL, or other server secret in an
`EXPO_PUBLIC_` variable.

`pnpm dev` and `pnpm dev:web` start the legacy web prototype. They are not the product
client.

## Verification

```bash
pnpm format
pnpm typecheck
pnpm test
pnpm test:integration
pnpm openapi:check
pnpm build
```

`pnpm test:mobile` runs the React Native component suite. Guest Maestro flows live under
`apps/mobile/.maestro` and require the Maestro CLI plus a built app. Database and RLS checks
(`pnpm test:db`, `pnpm test:prisma`) need migrations and seed data applied against
`SUPABASE_DB_URL` or `DATABASE_URL`.

GitHub Actions provisions PostgreSQL 17, applies every Supabase migration and seed row, and
runs the SQL/RLS and Prisma smoke suites on every push to `main` and every pull request.

This repository is named PeddieHacks26 after its original event; the product is AdaptFit.
