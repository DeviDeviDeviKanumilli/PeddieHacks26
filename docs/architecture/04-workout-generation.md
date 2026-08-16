# Adaptive Workout Generation

Generation turns a compatible catalog slice into an ordered prescription: exercises, sets,
reps, rest, and alternatives. It runs on-device for guest mode and may run on the API for
authenticated generation. Both paths use the same domain rules.

## Inputs

- Validated movement profile
- Compatibility results from `compatibility-v1`
- Catalog rows with default prescriptions
- Optional session length and focus hints

## Procedure

1. Exclude incompatible exercises.
2. Prefer `compatible` over `caution`.
3. Diversify category and primary region so a session is not a single-pattern list.
4. Apply default sets, reps, and rest from the catalog, then clamp to safe bounds.
5. Attach alternatives that share the slot's purpose and remain eligible.
6. Estimate duration from sets, reps, and rest.

## Guest Planner

The on-device planner (`buildGuestWorkout`) produces up to four eligible items. Equipment
**None** is interpreted as a stable chair, not as the absence of furniture. Band, wall, and
dumbbell requirements still apply when those tokens are unset.

## API Planner

`generation-v1` on the API may return a longer authenticated plan (three to six items).
The mobile Workout tab currently persists the local planner result. Live session sync
requires a UUID workout identifier from the API.

## Outputs

A workout is an ordered list of items. Each item has an exercise slug, sets, reps, and
rest seconds. Users may edit those fields before a session starts. Generation does not
emit coaching copy or pose instructions.
