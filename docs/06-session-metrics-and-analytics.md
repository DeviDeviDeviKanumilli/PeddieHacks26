# Session Metrics and Analytics

## Workout-session states

```text
active -> paused -> active
active -> resting -> active
active|paused|resting -> completed|cancelled
```

## Exercise-session states

```text
pending -> active
active -> paused|resting|completed|cancelled
paused|resting -> active|completed|cancelled
pending -> skipped
```

Invalid transitions return `409 invalidStateTransition`.

## Metric payload

Each rep may contain:

- `setNumber`, `repNumber`.
- `counted` and `durationMs`.
- `rangeOfMotionDeg`.
- `targetPositionReached`.
- `accuracyScore`, `controlScore`, `stabilityScore`, and `formScore` from 0–100.
- `trackingConfidence` from 0–1.
- Known `feedbackCodes` only.
- `recordedOffsetMs` from exercise start.

The API stores derived values only. Raw camera frames, images, audio, landmarks, coordinates, and arbitrary text are rejected.

## Ingestion behavior

Metrics are accepted while an exercise is active, paused, or resting. Clients must flush queued metrics before completion. Batches are deduplicated by `(exercise_session_id, batch_id)` and reps by `(exercise_session_id, set_number, rep_number)`.

Metric batches are limited to 100 reps and 64 KB. The API returns accepted, duplicate, and rejected counts.

## Completion transaction

Exercise completion must atomically:

1. Lock and validate the exercise session.
2. Deduplicate metric batches.
3. Aggregate valid reps.
4. Create one immutable summary.
5. Update completed counts.
6. Append a completion event.
7. Transition the session.

Workout completion requires every child exercise to be completed, skipped, or cancelled. It updates daily progress once and is idempotent.

## Analysis formulas

Only reps with confidence at least `0.60` contribute to form analytics. Low-confidence manually counted reps may contribute to completion.

- Completion: counted reps / target reps.
- ROM: average, minimum, maximum, and percentage in target range.
- Accuracy: target-position successes / valid tracked reps.
- Control: average control score.
- Stability: average stability score.
- Tempo: mean, median, standard deviation, and target adherence.
- Performance-change indicator: compare first and final third of at least six valid reps; classify stable, mild decline, or notable decline. This is not a medical fatigue measurement.

Overall score weights:

```text
completion       20%
ROM              25%
movement accuracy 20%
control          15%
stability        10%
tempo            10%
```

Missing metrics are removed and the remaining weights are renormalized.

Progress compares the current score with the previous three completed sessions for the same exercise. Until three sessions exist, use the previous completed session. Return both score delta and relative percentage; return null when there is no baseline.

## Progress data

`daily_progress` powers the activity grid, totals, and date-range summaries. Body coverage is calculated from completed exercises and muscle/body-region intensity metadata. Session deletion recomputes affected daily rows.
