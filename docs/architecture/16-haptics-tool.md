# Haptics Tool

`haptics.pulse` plays a platform haptic pattern. Haptic feedback is off until the user
enables it in accessibility preferences.

## Legal Arguments

- `pattern`: `selection`, `success`, `warning`, or `nudge`
- `code`: optional issue code that selected the pattern

## Mapping

- `selection`: control taps already handled by `AccessiblePressable`; the tool does not
  duplicate those
- `success`: repetition accepted
- `warning`: known issue code with `high` priority
- `nudge`: rest complete or set complete

## Rules

- Patterns are enumerations, not raw Core Haptics or VibrationEffect scripts from the
  model
- The tool no-ops when the preference is off or the platform cannot vibrate
- Rate limit: one non-selection pulse per 400 ms
