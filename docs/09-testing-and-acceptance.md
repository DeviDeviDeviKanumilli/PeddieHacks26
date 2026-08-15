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

## Web client tests

- Every route renders through direct navigation and unknown routes reach the designed
  recovery screen.
- Demo mode works without Supabase or API environment variables and persists only the
  intended non-sensitive demo state in the browser.
- Providing both public Supabase variables exposes live authentication; partial or
  invalid configuration fails safely without exposing secrets.
- API requests attach the Supabase bearer token in live mode and preserve the typed API
  error envelope.
- Onboarding, discovery, compatibility warning, profile, session controls, history,
  progress, and analysis actions are keyboard operable.
- Information conveyed by compatibility or progress colors also has text or an icon.
- Camera permission is requested only after a user action, audio is disabled, denial and
  unavailable-device states offer a no-tracking path, and active media tracks stop on
  cleanup.
- Client requests never contain a video, image, audio, frame, blob, landmark, or raw
  coordinate payload. Only allowlisted derived metrics may reach the API client.
- Guided-session timers, pause, resume, rest, restart, early completion, and history
  updates are deterministic under fake timers.
- Layouts remain usable at narrow mobile widths, text zoom, reduced motion, and desktop
  widths, with 44 by 44 CSS pixel targets where required.

## Seed tests

- Exactly 24 active exercises.
- Exactly 6 tracking profiles.
- Every exercise has a source and review metadata.
- Every exercise has body/capability/equipment requirements.
- Every tracking profile references known feedback codes.
- All slugs and reference IDs are unique and stable.

## Browser demo-mode acceptance

1. Start `pnpm dev` without client environment variables and open
   `http://localhost:5173`.
2. Complete onboarding or demo sign-in and move through exercise discovery, selection,
   detail, compatibility guidance, and profile summary.
3. Choose an exercise, deny camera permission, continue without tracking, and complete a
   guided session with pause, resume, rest, and early-completion controls.
4. Repeat with camera permission when available and verify the preview stays local and
   its tracks stop after the camera-assisted flow ends.
5. Review the completion view, dashboard, history, and detailed analysis, then reload and
   verify intended demo state persistence.
6. Inspect browser network requests and confirm that no raw media, frames, audio, pose
   landmarks, or coordinates leave the browser.

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
11. Confirm the deployed site uses HTTPS, direct navigation works for every client route,
    and the web origin is the only configured production CORS origin.

## CI gates

```text
pnpm install --frozen-lockfile
pnpm format
pnpm typecheck
pnpm test
pnpm test:integration
pnpm openapi:check
pnpm build
supabase db reset
pnpm test:db
```

The root `format`, `typecheck`, `test`, and `build` commands include `apps/web` through
the pnpm workspace. For focused client iteration, use:

```text
pnpm --filter @peddie/web typecheck
pnpm --filter @peddie/web test
pnpm --filter @peddie/web build
```

Browser demo-mode acceptance remains a release gate even when hosted Supabase credentials
are unavailable. The hosted live-mode scenario and database tests are environment-gated.

## Current implementation status

### Current automated gates

- `pnpm format`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm test:integration` (the API Fastify-injection suite)
- `pnpm openapi:check` (required route/path smoke check)
- Recursive web-client typecheck and production build through the root commands
- Disposable PostgreSQL execution of all migrations and `supabase/seed.sql`
- `supabase/tests/rls.sql` owner-isolation and anonymous-catalog checks
- `supabase/tests/profile_rpc.sql` atomic profile replacement and version checks
- `supabase/tests/session_lifecycle.sql` transactional session, metric, summary, and daily-progress checks
- `supabase/tests/workout_item_rpc.sql` optimistic atomic item replacement check
- Domain tests for session transition matrices, metric limits, confidence filtering, analysis formulas, and progress baselines

The migration/seed checks currently run against a disposable local PostgreSQL
instance because Docker is unavailable in the current environment. After migrations
and seed data are applied, `pnpm test:db` runs each SQL test file using
`SUPABASE_DB_URL` or `DATABASE_URL`. The equivalent Supabase command is:

```text
supabase db reset
pnpm test:db
```

The authenticated profile, workout, tracked-session, analytics, and progress portions
of the acceptance flow are covered by Fastify injection tests. Web route, interaction,
camera-privacy, and responsive browser coverage belongs in `apps/web`. Hosted deletion
smoke tests, full browser live-mode acceptance, Docker-backed Supabase reset, and advisor
output remain deployment-gated.
