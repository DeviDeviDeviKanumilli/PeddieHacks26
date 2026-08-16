# Multimodal Accessibility

Guidance is visual, spoken, and haptic. Each channel is independently gated by the
movement profile's accessibility flags. The session remains usable with all three off.

## Channels

| Channel | Default | Gate |
| --- | --- | --- |
| Visual cues | On | High contrast restyles; reduced motion removes animation |
| Voice guidance | Off | Spoken feedback preference; speech tool |
| Haptic pulses | Off | Haptic feedback preference; haptics tool |
| Large text | Off | Larger text preference scales type |
| One-handed | Off | Increases control minimum height |

## Visual

Repetition count, set index, rest timer, and known feedback codes render as text and
simple status color. High contrast uses ink-on-canvas borders rather than low-contrast
fills. Tracking-off is labeled, not implied by a blank camera.

## Voice and Haptics

See the speech and haptics tools. They share the same `feedbackCodes` vocabulary as the
visual channel so a user who enables one extra channel hears or feels the same events.

## No Extra Capture

Accessibility does not require a camera. Spoken and haptic guidance work from tracker
events during a no-camera session, using manual or timed counts.
