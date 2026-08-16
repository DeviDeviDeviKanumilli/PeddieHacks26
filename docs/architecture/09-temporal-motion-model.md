# Temporal Motion Model

The temporal motion model inspects a short feature window for quality and known error
patterns. It is bounded, recipe-specific, and silent when confidence is insufficient.

## Role

Where the repetition tracker answers "did a cycle complete?", this model answers "did the
cycle stay inside the recipe's known envelopes?" It may emit issue codes. It does not
diagnose injury or grade the user clinically.

## Signals

- Range of motion below the recipe's minimum useful arc
- Instability (variance above the recipe ceiling during the concentric phase)
- Velocity outside the slow-and-controlled envelope
- Asymmetry on bilateral recipes when both sides are visible
- Dropped confidence mid-cycle

## Issue Codes

Issue codes are a closed vocabulary (`feedbackCodes` in `@peddie/contracts`). Unknown
strings are discarded. Codes are suitable for local coaching cues and, when the sample is
native-backed, for allowlisted metric fields. They are never free-text model output.

## Refusal

If the window is too short, the camera is off, or native inference is absent, the model
emits no issue codes. Guest simulations must not persist fabricated quality measurements
in live mode.
