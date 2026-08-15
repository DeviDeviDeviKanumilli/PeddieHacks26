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

## Seed tests

- Exactly 24 active exercises.
- Exactly 6 tracking profiles.
- Every exercise has a source and review metadata.
- Every exercise has body/capability/equipment requirements.
- Every tracking profile references known feedback codes.
- All slugs and reference IDs are unique and stable.

## Hosted demo acceptance

1. Sign in with the demo account.
2. Set both knees and standing to avoid; set seated posture and stable chair to available.
3. Generate a workout and verify no incompatible exercise appears.
4. Swap one exercise for a compatible alternative.
5. Start the workout and upload duplicate-safe metrics.
6. Complete an exercise and verify completion, ROM, accuracy, control, stability, tempo, and progress output.
7. Complete the workout and verify history, totals, activity, and body coverage.
8. Confirm a second user cannot access demo data.
9. Delete a session and verify progress recomputation.
10. Delete the account and verify application rows and Auth identity are removed.

## CI gates

```text
pnpm install --frozen-lockfile
pnpm biome check .
pnpm typecheck
pnpm test
supabase db reset
pnpm test:db
pnpm test:integration
pnpm build
pnpm openapi:check
```
## Current implementation status

### Current automated gates

- `pnpm format`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Disposable PostgreSQL execution of all migrations and `supabase/seed.sql`
- `supabase/tests/rls.sql` owner-isolation and anonymous-catalog checks
- `supabase/tests/profile_rpc.sql` atomic profile replacement and version checks

The migration/seed checks currently run against a disposable local PostgreSQL
instance because Docker is unavailable in the current environment. The equivalent
Supabase command is:

```text
supabase db reset
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
```

The authenticated profile and workout portions of the acceptance flow are covered
by Fastify injection tests. The tracked session, analytics, progress, and deletion
portions remain pending until their state machine is implemented.
