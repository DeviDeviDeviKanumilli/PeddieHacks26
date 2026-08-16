# Repetition and State Tracker

The repetition tracker is a deterministic state machine. It counts completed repetitions
and advances sets from recipe thresholds, not from a language model.

## States

- Idle: tracking not started or camera unavailable
- Seeking target: waiting for the concentric or opening angle
- Seeking return: waiting for the eccentric or closing angle
- Rep complete: one cycle accepted
- Set complete: prescribed repetitions reached
- Rest: between sets
- Exercise complete: prescribed sets reached

## Acceptance Rules

A repetition is accepted only when:

1. Confidence stays above the recipe gate through the cycle
2. The target angle is reached
3. The return angle is reached without abandoning the movement
4. The cycle duration is inside the recipe's plausible bounds

Bilateral recipes may require left and right cycles. Seated biceps curl is the reference
implementation of this machine in the TypeScript port of `exercise_analyzer.py`.

## Outputs

The tracker publishes `rep_accepted`, `set_complete`, `rest_started`, and
`exercise_complete` events. Counts are integers. The tracker never invents form quality
scores for live upload when native inference did not produce the sample.
