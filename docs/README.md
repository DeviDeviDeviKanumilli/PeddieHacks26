# PeddieHacks26 Product Plan

This folder is the system source of truth for AdaptFit, a React Native iOS and Android
application with a Fastify API, domain rules, Supabase data model, privacy posture, and
mobile deployment plan.

Last updated: 2026-08-16.

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
12. [Market and evidence brief](12-market-and-evidence.md)
13. [React Native mobile application](13-react-native-mobile.md)
14. [Visual assets and anatomy system](14-visual-and-anatomy-system.md)

## Locked decisions

- React Native and Expo power the iOS and Android client under `apps/mobile`.
- The mobile client supports a persistent guest mode and can use Supabase Auth plus the
  Fastify API when public mobile variables are configured.
- Node.js 24 LTS, TypeScript, Fastify 5, and pnpm.
- Supabase Auth and Postgres; Fastify API deployed to Railway.
- Prisma 7 is the typed ORM for application table queries; Supabase SQL remains the source of truth for RLS, grants, triggers, and lifecycle RPCs.
- Local Supabase development plus one hosted demo environment.
- Email/password authentication plus an operator-provisioned hosted demo account.
- Public exercise catalog; authentication required for personalization and history.
- Deterministic compatibility rules and scoring; no LLM in eligibility decisions.
- Pose estimation remains on-device. The API stores derived metrics only.
- Production pose uses a native module inside an Expo development build; Expo Go cannot
  load MediaPipe. Improve detection by calibrating per-exercise recipes, not by training
  a new pose network.
- The Python tree under `model/` is a desktop calibration lab. It is not the mobile
  runtime and must not replace `compatibility-v1`.
- Raw camera video, images, audio, and pose landmarks never leave the device; camera use
  is optional.
- Retain derived metrics until session or account deletion.
- Seed 24 sourced exercises, with tracking rules for 6.
- General wellness positioning for adults; no diagnosis, treatment, or rehabilitation claims.

## Current state

AdaptFit's product target is the PDF-derived React Native experience under `apps/mobile`,
including onboarding, discovery, exercise details and safety gates, native camera
permission/setup, active workout states, completion, dashboard, history, and analysis.
The repository still contains an earlier `apps/web` reference prototype, but it is not
the primary application and must not define future platform decisions. The mobile client
provides local guest state plus optional Supabase Auth and Fastify API connectivity.
Native onboarding, discovery, workout/session flows, camera-optional tracking, analysis,
progress, profile management, and account deletion are implemented.
The mobile client also includes original flat illustration assets plus a reusable,
data-driven front/back anatomy component for movement selection, exercise muscle emphasis,
planned-workout coverage, and completed-workout history.

Recommended plans on the phone are built locally by `buildGuestWorkout` (up to four
compatible exercises). Guest equipment **None** is treated as a stable chair, not as
“no furniture.” Multi-exercise sessions continue from completion back to setup for the
next remaining item. Workout setup uses a paged carousel, a custom form-feedback toggle,
and a start preview that always names the first remaining movement. Back exits use
`router.replace` so they still work when the tab stack is not in history.

### Current mobile presentation

The shipped mobile surface is intentionally compact and follows the reference hierarchy:

- Home owns the shared AdaptFit brand and notification header, a single current-plan card,
  one daily tip, and two quick actions. Explore does not repeat the global header.
- Explore preserves the **For me** and **All exercises** modes. **For me** shows a short
  personalized list followed by collections; **All exercises** shows search, category chips,
  and the complete catalog. Collections are deterministic client groupings over reviewed
  catalog attributes, not a second source of exercise content.
- Exercise and collection list rows use the reusable code-native `MovementMark` component,
  so a visible category mark renders immediately instead of depending on a bitmap thumbnail.
  The compact exercise detail keeps one reviewed family illustration beside the name and
  avoids a large hero banner.
- Progress puts the selected date-range dropdown and active-time/workout/exercise/rep totals
  first, then the matching activity grid, muscle groups hit, and recent workouts. The same
  range bounds are used for local guest data and live API activity requests.
- A no-camera session keeps the anatomy view and rep controls visible, with a compact
  icon-plus-text **Tracking off** badge and nearby manual-count guidance rather than a
  full-screen warning.
- Workout setup pages remaining exercises in a carousel with a narrow peek and dots (not
  arrows). Form feedback is a custom on/off toggle aligned with the camera icon. Start
  workout begins the first remaining exercise, not the visible carousel page. After each
  movement, the client returns to setup for the next item instead of ending the workout.

The backend workspace, Supabase schema, and Prisma data-access layer are also
implemented. `apps/api` is a Fastify service with repository adapters, authenticated routes, OpenAPI output,
readiness checks, route-specific rate limiting, redacted structured logging, and
memory-backed tests. `packages/contracts` owns
the TypeBox API boundary, while `packages/domain` owns pure compatibility, workout
generation, session-analysis, and progress rules.

The database currently has nine CLI-created migrations, deterministic catalog seed
data, explicit grants, forced RLS, owner-scoped policies, and transactional lifecycle
RPCs. Prisma table transactions establish the matching Postgres RLS role and JWT
subject; the request-scoped Supabase client remains for lifecycle RPCs and the
service-role client is isolated to account deletion. The development-only Python tree
under `model/` remains a desktop calibration lab. The Android MediaPipe module,
TypeScript analyzer, seated-biceps-curl recipe, and session complete/analysis/live-upload
wiring now live in `apps/mobile`. Guest Expo Go still uses a labeled timer. The next
pose step is a physical Android development build: install with
`pnpm dev:mobile:android:device`, confirm no-camera still works, then calibrate curl on
that camera. The backend never receives raw camera media or landmarks. See
[session metrics](06-session-metrics-and-analytics.md) and
[the React Native mobile plan](13-react-native-mobile.md).

Repeatable checks are available through `pnpm format`, `pnpm typecheck`, `pnpm test`,
`pnpm build`, `pnpm openapi:check`, `pnpm test:integration`, and `pnpm test:db`.
GitHub Actions provisions a disposable PostgreSQL 17 service, applies every migration
and seed row, and runs both `pnpm test:db` and `pnpm test:prisma` as mandatory gates.
Locally, those commands use `SUPABASE_DB_URL` or `DATABASE_URL` after migrations and
seed data are applied. `pnpm smoke:hosted` verifies a deployed API and can optionally
exercise and clean up the complete workout/session loop.
