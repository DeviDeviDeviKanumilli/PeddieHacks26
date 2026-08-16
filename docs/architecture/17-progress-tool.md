# Progress Tool

`progress.record_set` and `progress.record_exercise` write derived session facts into the
local store and, when live sync is active, onto the allowlisted metric path.

## Legal Arguments

- `exerciseId`, `setIndex`
- `acceptedReps`: non-negative integer
- `elapsedMs`: non-negative integer
- `feedbackCodes`: array of known codes, optional
- `nativeInference`: boolean

## Rules

- Counts come from the repetition tracker, not from the orchestrator
- If `nativeInference` is false, quality-like fields are omitted
- The tool cannot attach ROM landmarks, images, or notes
- Idempotency is by exercise session id plus set index

## Local Then Remote

Guest mode writes SQLite history on workout completion. Live mode batches allowlisted
`RepMetric` objects to the Fastify session routes. Failure to sync does not roll back the
on-device count; the user can finish on the device.
