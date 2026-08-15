# Testing and Acceptance

## Unit tests

- Body-region state matrix.
- Capability state matrix.
- Missing equipment and OR-equipment groups.
- Hard conflict and caution rules.
- Deterministic ranking and tie-breaking.
- Workout duration composition.
- Alternative selection.
- Analytics formulas and insufficient-data behavior.
- Session transition matrices.
- Optimistic concurrency.

## Database and RLS tests

- Anonymous users read only active public catalog/reference rows.
- User A cannot read or modify User B data.
- Ownership cannot be reassigned through updates.
- Every foreign key has a supporting index.
- Every exposed table has RLS and explicit grants.
- Duplicate batches and request IDs are idempotent.
- Completion and daily-progress updates are atomic.
- Session and account deletion cascade correctly.
- Catalog source validation rejects incomplete exercises.

## API tests

- Missing, expired, and malformed tokens.
- Unknown input-field rejection.
- Response-schema field leakage.
- Cursor pagination without duplicates or omissions.
- Every documented error/status code.
- Rejected video, image, landmark, coordinate, and arbitrary feedback payloads.
- Metrics rejected after session completion.
- Invalid state transitions return `409`.
- OpenAPI matches runtime schemas.

## React Native mobile client tests

- Every Expo Router route renders through native navigation and unknown/deep links reach
  the designed recovery screen.
- Demo mode works without Supabase or API environment variables and persists only the
  intended non-sensitive guest state on-device.
- Providing both public Supabase variables exposes live authentication; partial or
  invalid configuration fails safely without exposing secrets.
- API requests attach the Supabase bearer token in live mode and preserve the typed API
  error envelope.
- Onboarding, discovery, compatibility warning, profile, session controls, history,
  progress, and analysis actions are screen-reader operable and use native touch targets.
- Home owns the shared brand/notification header, Explore begins with discovery, and the
  Explore **For me**/**All exercises** tabs expose their distinct recommendation and catalog
  hierarchies. Collection rows and exercise rows must show a non-empty reusable movement mark.
- Exercise detail keeps the reviewed family thumbnail beside the name and does not regress to
  a large illustration banner. Progress exposes its range dropdown and scopes totals, activity,
  muscle coverage, and recent workouts to the selected range.
- Information conveyed by compatibility or progress colors also has text or an icon.
- Camera permission is requested only after a user action, audio capture is disabled,
  denial and unavailable-device states offer a no-tracking path, and the native camera
  session stops on cleanup or app backgrounding.
- Client requests never contain a video, image, audio, frame, blob, landmark, or raw
  coordinate payload. Only allowlisted derived metrics may reach the API client.
- Guided-session timers, pause, resume, rest, restart, early completion, and history
  updates are deterministic under fake timers.
- Layouts remain usable on supported phone and tablet sizes, Dynamic Type, reduced
  motion, and high contrast, with at least 44-point iOS and 48dp Android targets.

## Seed tests

- Exactly 24 active exercises.
- Exactly 6 tracking profiles.
- Every exercise has a source and review metadata.
- Every exercise has body/capability/equipment requirements.
- Every tracking profile references known feedback codes.
- All slugs and reference IDs are unique and stable.

## Mobile guest-mode acceptance

1. Start the Expo development server without live client environment variables and open
   the application on iOS and Android.
2. Complete onboarding or demo sign-in and move through exercise discovery, selection,
   detail, compatibility guidance, profile summary, both Explore modes, and a collection route.
3. Choose an exercise, deny camera permission, continue without tracking, and complete a
   guided session with pause, resume, rest, and early-completion controls.
4. Repeat with camera permission when available and verify the preview stays on-device
   and the native camera session stops after the assisted flow ends.
5. Review the completion view, Progress dashboard, each range option, history, and detailed
   analysis, then reload and verify intended demo state persistence.
6. Inspect mobile network requests and confirm that no raw media, frames, audio, pose
   landmarks, or coordinates leave the device.

## Hosted live-mode acceptance

1. Sign in with the demo account.
2. Set both knees and standing to avoid; set seated posture and stable chair to available.
3. Generate a workout and verify no incompatible exercise appears.
4. Swap one exercise for a compatible alternative.
5. Start the workout and upload duplicate-safe derived metrics only.
6. Complete an exercise and verify completion, ROM, accuracy, control, stability, tempo, and progress output.
7. Complete the workout and verify history, totals, activity, and body coverage.
8. Confirm a second user cannot access demo data.
9. Delete a session and verify progress recomputation.
10. Delete the account and verify application rows and Auth identity are removed.
11. Confirm iOS and Android preview builds reach only the configured HTTPS API, deep links
    resolve correctly, and no unapproved API origin is used.

## CI gates

```text
pnpm install --frozen-lockfile
pnpm format
pnpm typecheck
pnpm test
pnpm test:integration
pnpm openapi:check
pnpm build
ALLOW_DATABASE_BOOTSTRAP=true SUPABASE_DB_URL=<disposable-url> pnpm db:test:prepare
pnpm test:db
pnpm test:prisma
```

The root `format`, `typecheck`, `test`, and `build` commands must include `apps/mobile`
through the pnpm workspace. For focused client iteration, use:

```text
pnpm --filter @peddie/mobile typecheck
pnpm --filter @peddie/mobile test
pnpm --filter @peddie/mobile build
```

Mobile guest-mode acceptance remains a release gate even when hosted Supabase credentials
are unavailable. The hosted live-mode scenario and database tests are environment-gated.

## Current implementation status

### Current automated gates

- `pnpm format`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm test:integration` (the API Fastify-injection suite)
- `pnpm openapi:check` (required route/path smoke check)
- Recursive React Native client typecheck and mobile build/config validation through the
  root commands
- Native Jest/React Native Testing Library coverage for the body-map text controls,
  compatibility adaptation, contract mapping, profile synchronization, and count-only
  metric construction
- A committed Maestro guest onboarding and no-camera workout flow under
  `apps/mobile/.maestro`
- `pnpm test:prisma` (RLS-scoped Prisma catalog smoke check when a database URL is set)
- Mandatory GitHub Actions PostgreSQL 17 execution of all migrations and `supabase/seed.sql`
- `supabase/tests/rls.sql` owner-isolation and anonymous-catalog checks
- `supabase/tests/profile_rpc.sql` atomic profile replacement and version checks
- `supabase/tests/session_lifecycle.sql` transactional session, metric, summary, and daily-progress checks
- `supabase/tests/workout_item_rpc.sql` optimistic atomic item replacement check
- Domain tests for session transition matrices, metric limits, confidence filtering, analysis formulas, and progress baselines
- Focused mobile tests for anatomy mappings, movement-mark rendering, collection predicates,
  progress-range bounds, exercise-card accessibility, and count-only metric construction

GitHub Actions creates a clean PostgreSQL service and runs `pnpm db:test:prepare`
before the database and Prisma suites. The bootstrap script refuses to operate unless
`ALLOW_DATABASE_BOOTSTRAP=true`; it must only be used with a disposable local or CI
database. For the full local Supabase stack, the equivalent command is:

```text
supabase db reset
pnpm test:db
```

The authenticated profile, workout, tracked-session, analytics, and progress portions
of the acceptance flow are covered by Fastify injection tests. `pnpm smoke:hosted`
automates public and authenticated deployment checks and can run the mutating loop,
cross-user isolation, cleanup, and disposable-account deletion when the corresponding
tokens and safety flags are provided. Native route, interaction, and camera-privacy
coverage now belongs to `apps/mobile`; an iOS simulator launch and terminate/relaunch
lifecycle pass has been completed. Full iOS/Android live-mode acceptance,
Docker-backed Supabase reset, hosted execution, advisor output, and load targets remain
deployment-gated.
