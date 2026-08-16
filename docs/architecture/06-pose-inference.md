# Pose Inference

Pose inference converts camera frames into joint visibility and joint angles. It runs on
the device. The backend does not accept frames, landmarks, or coordinate arrays.

## Runtime

Android development builds load MediaPipe Pose Landmarker from module assets. The `.task`
model is bundled at compile time, not downloaded during a session. Inference is skipped
when the module is absent; guest sessions then use a labeled timer rather than invented
form scores.

## Outputs Allowed Into JavaScript

- Joint angles used by the exercise analyzer
- Joint visibility / confidence suitable for gating a rep
- A boolean that native inference produced the sample

## Outputs Forbidden In JavaScript Persistence

- Landmark x/y/z/visibility arrays
- Pixel coordinates
- Frame buffers, thumbnails, or encoded images
- Audio PCM or file URIs from the camera

## Calibration

Detection quality is improved by per-exercise recipes (target angle, return angle,
laterality). Seated biceps curl is the first calibrated recipe. The architecture does not
train or ship a replacement pose network.
