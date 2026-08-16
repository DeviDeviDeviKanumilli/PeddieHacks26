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

## Mobile progress and tracking presentation

The native Progress tab uses the selected 7-day, 4-week, or 12-week UTC window for its top-line
active time, workout, exercise, and rep totals, activity grid, muscle groups hit, and recent
workouts. Guest history is filtered locally; live mode requests the same window from the API.

When camera tracking is not selected or permission is denied, the active session remains a
valid manual-count path. The client keeps the anatomy view and **Count rep** control available,
shows a compact video-off icon with **Tracking off**, and submits only counted-rep derived data
when an authenticated session is synchronized. On-device pose sessions may also submit
allowlisted range and confidence. The client does not manufacture form, ROM, or fatigue
measurements for a manual or guest-simulated session.

The pure domain implementation now enforces the 100-rep/64 KB batch limits, rejects
duplicate reps and unknown feedback codes, filters form metrics below 0.60 tracking
confidence, renormalizes the documented score weights when metrics are missing, and
classifies six-or-more-rep performance change as stable, mild decline, or notable
decline. API schemas accept derived metric fields only; raw video, frames, audio,
landmarks, coordinates, and arbitrary feedback text have no accepted fields.

Implementation status: memory and Supabase session repositories now expose the session
state machine, derived-metric batch ingestion, exercise analysis, workout completion,
history, activity totals, body coverage, and per-exercise progress routes. The Supabase
path uses transactional lifecycle RPCs and rebuilds affected daily rows after session
deletion. Unknown metric fields are rejected by the request validator rather than
silently stripped.

## Local MediaPipe prototype

The development-only Python tree lives under `model/` (not `models/`). The `model` git
branch that added it is merged to `main`. It is a desktop OpenCV webcam lab, not the
React Native tracker.

| File | Role |
| --- | --- |
| `vision_model.py` | Downloads MediaPipe Pose Landmarker lite, detects one person, computes a 3-point world-landmark joint angle |
| `exercise_analyzer.py` | ROM stats, two-state rep machine, bilateral set/rest tracker, terminal summary |
| `exercise_selector.py` | Bitmask eligibility over the 24 catalog slugs |
| `main.py` | Webcam loop; default label is seated biceps curl |
| `test_analyzer.py` / `test_selector.py` / `test_vision.py` | unittest coverage for analyzer, selector, and 3D angles |

The analyzer is the reusable part: a rep needs a target angle then a return angle; both
limbs must finish a cycle; rest then next set; missing detections are ignored. Frames and
landmarks stay in process memory and are not sent to the API.

It is not production-ready as-is:

- `main.py` does not call the selector. `--exercise` is a summary label, not a joint
  recipe. The loop defaults to elbow landmarks `(11, 13, 15)` / `(12, 14, 16)`.
- The selector is a simplified bitwise filter. It has no capabilities, equipment,
  intensity, `limited` versus `avoid`, caution states, or ranking, and it must not
  replace `compatibility-v1`.
- Output is a terminal ROM span. It does not emit `RepMetric` fields (`counted`,
  `durationMs`, scores, `trackingConfidence`, known `feedbackCodes`).
- There is no `requirements.txt` or `pyproject.toml`. CI does not run the Python tests.
  `pose_landmarker_lite.task` is downloaded at runtime and is not gitignored. `main()`
  defaults `target_angle` to `50` while argparse defaults to `40`.

Use this folder to calibrate angles on a laptop webcam. Joint angles use MediaPipe 3D
world landmarks, with image-landmark visibility. The analyzer is already ported
to `apps/mobile/src/lib/tracking`, and MediaPipe runs inside the Android development
build. Remaining work is a physical-phone camera pass and per-exercise angle
calibration, not a new pose network. See
[the on-device pose plan](13-react-native-mobile.md#on-device-pose-integration).
