# Compatibility and Workout Generation

## Profile states

The first implementation uses `compatibility-v1` and `generation-v1`. Both engines
are pure TypeScript functions with stable ordering and no database or model calls,
so the API can test them independently and replay a generation request from its
stored profile snapshot.

Body-region states:

```text
neutral | focus | limited | avoid
```

Capability states:

```text
unknown | available | limited | avoid
```

Equipment uses explicit IDs. An empty equipment set means no equipment. Required equipment may use OR-groups such as stable chair OR wheelchair.

## Hard filters

Exclude an exercise when:

- An avoided body region has active or high demand.
- A limited body region has high demand.
- An avoided required capability is used.
- A required capability is unknown.
- Any required equipment group is unsatisfied.
- The exercise is inactive.
- The exercise exceeds the user's requested intensity.

## Caution results

Return `caution` for:

- Avoided body region with minimal stabilizing demand.
- Limited body region with active/moderate demand.
- Limited required capability.
- Missing optional tracking metrics.

Generated workouts use only compatible exercises. Manual selection may use caution exercises only with exact warning-code acknowledgement.

## Ranking

Start at 50 and apply:

- +25 for a requested primary target.
- +10 for a requested secondary target.
- Up to +20 for profile focus regions.
- +10 for goal/category alignment.
- +5 for equipment simplicity.
- −15 per caution, capped at −30.
- −12 for repeating the previous exercise family.
- −8 for repeating the previous primary target.

Clamp to 0–100. Break ties by stable exercise slug. Every result includes the engine version.

## Workout composition

- 5–10 minutes: 3 exercises.
- 11–20 minutes: 4 exercises.
- 21–30 minutes: 5 exercises.
- 31–45 minutes: 6 exercises.

Use catalog defaults first, then adjust sets from 1–5 to target 85–110% of requested duration. Avoid consecutive high-demand work on the same region. Preserve variety by family and target region.

If there are not enough compatible exercises, return `422 insufficientCompatibleExercises` with safe configuration suggestions. Never fill the workout with an incompatible exercise.

## Alternatives

Alternatives must pass hard compatibility filters, preserve the primary purpose, stay within one difficulty level, use available equipment, and prefer the same position and tracking support. Each alternative returns a stable explanation code and message.

## Catalog review requirements

The 24 seeded exercises must include:

- At least one reputable source.
- Review date and reviewer role.
- Body demands and capability demands.
- Required/optional equipment behavior.
- Safety cues and adaptation text.
- Tracking support metadata where applicable.
- Stable slug and content version.

No catalog record becomes active if the source validator fails.

The initial domain catalog contains 24 deterministic exercise records. Six have
tracking profile keys matching the camera-derived exercises in the product scope.
Catalog persistence, source validation, and activation checks are implemented in
the Supabase phase; the domain package already exercises the compatibility and
duration-generation behavior against the complete catalog.
