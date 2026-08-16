# Feedback Tool

`feedback.emit` shows a known coaching cue. It does not generate novel sentences.

## Legal Arguments

- `code`: a `feedbackCodes` value from the contracts package
- `channel`: `visual`, `voice`, `haptic`, or `all_enabled`
- `priority`: `low` or `high`

## Mapping

Each code maps to a reviewed string and optional haptic pattern stored with the exercise
recipe. The tool looks up that mapping. It does not concatenate user text or model
completions.

## Deduping

High-priority codes may interrupt. Low-priority codes are coalesced: the same code cannot
emit more than once per repetition. Reduced-motion disables animated visual emphasis but
not the text itself.

## Persistence

Feedback codes may be included on allowlisted `RepMetric` rows when the sample is
native-backed. The original cue string is not stored on the server.
