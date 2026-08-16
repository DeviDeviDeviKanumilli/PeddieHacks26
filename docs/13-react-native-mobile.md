# React Native Mobile Application

## Product Platform

AdaptFit is a native mobile product for iOS and Android. React Native and Expo are the
required client stack, and the primary application belongs in `apps/mobile`. The existing
`apps/web` workspace is a legacy reference prototype only; it must not drive product,
navigation, camera, storage, accessibility, testing, or deployment decisions.

The application uses five bottom tabs outside focused workout flows:

1. Home
2. Explore
3. Workout
4. Progress
5. Profile

Onboarding, exercise details, workout review, swaps, session setup, camera permission,
camera setup, active exercise, rest, completion, and analysis use native stack navigation.
The tab bar is hidden during those focused routes. Root and onboarding stacks disable
swipe-back (`gestureEnabled: false`) because `GO_BACK` fails when the tab stack is not in
history, including after a Metro reload.

## Mobile Architecture

- Use Expo Router and strict TypeScript.
- Use native safe areas, keyboard handling, permissions, haptics, speech, and application
  lifecycle APIs.
- Use a device-local guest store for the self-contained demonstration path.
- Use Supabase Auth for persistent accounts and send its bearer token only to the Fastify
  API for private application data.
- Use `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_SUPABASE_URL`, and
  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for public mobile configuration.
- Never include a service-role key, database URL, or server credential in the app.
- Keep public request and response validation in `packages/contracts`; keep compatibility,
  recommendation, generation, and analytics rules in `packages/domain`.
- Keep session query helpers in `apps/mobile/src/lib/sessionFlow.ts` and local
  recommended-plan edits in `useAppStore.updateWorkoutItem`. Do not put generation-v1
  scoring in route handlers.

The mobile client must support onboarding, movement-profile editing, exercise discovery,
compatibility explanations, reviewed exercise details, workout generation and editing,
guided sessions, pause/rest behavior, completion, analysis, progress, history, and account
deletion.

## Camera and Pose Boundary

Camera use is optional. Permission is requested only after a user action, and every
camera-assisted route provides an equally prominent path that continues without tracking.
The camera session stops when the user leaves the flow or the application backgrounds.

Pose inference runs on-device. Raw video, still images, audio, frames, landmarks, and
coordinates never enter an API request and are never persisted. The client may upload
only the allowlisted derived metrics defined in `packages/contracts`.

The first mobile milestone may use a clearly labeled deterministic tracker in guest mode
when the native module is absent (Expo Go). Authenticated mode must not persist simulated
form measurements. Android development builds run MediaPipe on-device and emit allowlisted
rep metrics and known feedback codes rather than raw landmarks. That path has not yet
passed a physical-phone camera acceptance.

## On-Device Pose Integration

The Android development path lives in `apps/mobile/modules/adaptfit-pose`. It runs
MediaPipe Pose Landmarker on-device, applies camera-frame rotation, draws a native
skeleton overlay, and emits primary/secondary joint angles plus per-side confidence.
Landmark coordinates, frames, and images stay inside native code. `apps/mobile/src/lib/tracking`
owns the rep state machine and derives range, accuracy, control, stability, form, and known
feedback codes. Seated biceps curl, wall push-up, and seated knee extension have automatic
counting enabled; the remaining recipes show a camera preview with manual counting rather
than simulated tracking. Live mode may upload only allowlisted derived `RepMetric` fields.

Expo Go cannot load MediaPipe or a bundled `.task` model. Use `expo-dev-client` and
`pnpm dev:mobile:android:device` so the module owns one camera session for setup and the
active workout. The `.task` model is downloaded at compile time into module assets, not
at runtime. Inference stops on unmount, navigation away, or backgrounding.

Keep this split:

- Native: camera frames, MediaPipe Pose Landmarker, private landmark overlay, joint
  visibility, and derived joint angles.
- TypeScript: a noise-resistant state machine (confirmed start, target, and return;
  minimum range/time; unilateral or bilateral limb rule), sets/rest, ROM, quality scores,
  and actionable correction codes.
- JavaScript/API: allowlisted `RepMetric` fields and known `feedbackCodes` only.

Never emit landmark coordinates, frames, images, or audio to JavaScript for persistence
or to the API. When the native module or a calibrated recipe is absent, count manually
and do not invent form, ROM, or fatigue values. Stub recipes may still supply joint
indices for the camera preview, but they must not increment repetitions on a timer.

Calibrate six client recipes rather than training a new pose model. Seed data currently
reuses one ROM window (`30–140°`) and tempo (`2–6s`) for every tracked exercise. Each
tracking key needs its own joints, target/return angles, and limb rule:

| Tracking key | Starting joint recipe |
| --- | --- |
| `seated-biceps-curl-v1` | elbow angle plus upper-arm posture; enabled, pending final phone thresholds |
| `seated-resistance-band-row-v1` | elbow angle plus torso posture; manual until tested |
| `seated-march-v1` | hip angle plus knee posture; manual until tested |
| `seated-knee-extension-v1` | automatic knee-angle reps plus seated hip-posture feedback |
| `sit-to-stand-v1` | bilateral knee angle plus hip extension; manual until tested |
| `wall-push-up-v1` | automatic elbow-angle reps plus body-line posture feedback |

The first physical test device is Android. Install the development APK, confirm preview
and no-camera still work, then calibrate curl on that camera. iOS remains required for
release and still uses the `expo-camera` preview until the same native path ships.
Physical devices must use a LAN IP or hosted API origin, not `localhost`.

If lite detection is weak, try a larger off-the-shelf MediaPipe pose model. Do not train
a custom pose network for this milestone.

## Next Device Validation

The Mac-side module and session wiring are in the repository. They are not proven until
a development build runs on the Android test phone:

1. Enable USB debugging and run `pnpm dev:mobile:android:device`. First install compiles
   MediaPipe and downloads `pose_landmarker_lite.task` into module assets.
2. Complete a workout with tracking off. Manual count, pause, rest, and complete must
   still work.
3. Allow the camera on seated biceps curl. The badge should read **On-device tracking**.
   A stationary straight arm must remain at zero. A rep must start straight, traverse the
   intermediate range, reach the bent target for multiple frames, and return with control.
   Complete and analysis should show derived range and quality scores when samples were confident.
4. Inspect traffic: no frames, landmarks, or coordinates. Live upload may include
   counted, duration, range, confidence, `targetPositionReached`, and known
   `feedbackCodes` only.
5. If counts miss or fire early, adjust the curl target/return angles. Only then
   calibrate the other five recipes. iOS still uses `expo-camera` preview until the
   same native path ships.

## Accessibility

- Meet or exceed 44-point iOS and 48dp Android touch targets.
- Support Dynamic Type, screen readers, reduced motion, high contrast, and one-handed use.
- Never communicate movement status, compatibility, or progress through color alone.
- Provide visual, spoken, and haptic feedback according to user preferences.
  `apps/mobile/src/lib/accessibility.ts` applies those preferences: haptics on shared
  buttons and pressables, spoken status and coaching, larger type, high-contrast
  borders, reduced-motion press states, and extra one-handed bottom reach.
- Give the interactive body map an equivalent searchable/list-based control.
- Keep live coaching brief and present one actionable correction at a time.

## Mobile Delivery and Acceptance

- Provide iOS and Android development, preview, and production build profiles.
- Run React Native component tests and Maestro acceptance flows on both platforms.
- Verify native back behavior, deep links, permission denial, permission revocation,
  foreground/background transitions, camera cleanup, offline recovery, and token expiry.
- Inspect mobile network traffic and prove that no raw camera or landmark payload leaves
  the device.
- Accept the release only when a user can add a movement constraint, see recommendations
  visibly adapt, understand the reason, complete a camera-optional workout, review
  metrics-first analysis, and see progress in guest and authenticated modes.

## Current Implementation

The application now lives in `apps/mobile` and includes:

- Expo Router stacks plus native Home, Explore, Workout, Progress, and Profile tabs.
- A deliberately focused Home tab: one current workout, one daily tip, and two quick actions.
  The global brand and notification header lives on Home; Explore begins directly with discovery,
  while history and totals remain in Progress so the landing experience does not duplicate those
  destinations.
- A two-mode Explore tab that preserves **For me** and **All exercises**. For me contains a short
  personalized recommendation list and attribute-driven collections; All exercises contains the
  full searchable, filterable catalog. Exercise and collection thumbnails use reusable abstract
  code-native movement marks instead of person illustrations or image-only placeholders, with
  violet, teal, coral, and amber tones that distinguish strength, mobility, cardio, and balance
  contexts at a glance across exercise and collection lists.
- Collection routes reuse the same compatible catalog and exercise cards, showing the collection
  title, description, profile-specific count, and a compact back-to-Explore control.
- A compact exercise-detail header that places one reviewed movement-family illustration beside
  the exercise name. Prescription and compatibility information use plain dividers and text
  hierarchy instead of a large illustration banner or nested promotional cards.
- A range-aware Progress dashboard that puts active time, workout, exercise, and rep totals first,
  followed by the matching activity grid. The selected 7-day, 4-week, or 12-week range also scopes
  local muscle coverage and recent workouts; live mode requests the same backend date window.
- Six-step onboarding with an interactive body diagram and equivalent labeled region list.
- A SQLite-persisted guest adapter that remains usable without hosted configuration.
- Supabase email/password authentication using only the publishable key, persisted native
  sessions, AppState-aware token refresh, and bearer-token API requests.
- Profile and accessibility-settings synchronization, full public catalog hydration,
  reviewed exercise sources, and live progress. The Workout tab recommended plan is still
  built locally by `buildGuestWorkout` in guest and live modes. The generate-workout API
  client method exists; screens do not call it yet.
- Camera permission disclosure, camera setup, equally prominent no-camera continuation,
  compact in-session tracking-off status, nearby manual rep guidance, pause, timed rest, early
  completion, and metrics-first analysis. See
  [session setup and multi-exercise flow](#session-setup-and-multi-exercise-flow).
- Authenticated session lifecycle calls that submit counted-rep derived records and
  confidence-backed on-device pose measurements. Manual camera sessions never invent
  or persist form values.
- An Android-first local Expo module under `apps/mobile/modules/adaptfit-pose` that runs
  MediaPipe Pose Landmarker on-device, keeps a skeleton overlay native, and emits only
  derived angles/confidence to TypeScript. The mobile analyzer rejects single-frame noise,
  derives per-rep range and quality scores, and keeps unverified recipes manual. Session
  complete and analysis show those on-device measurements when confident samples exist.
  Expo Go cannot load this module; use
  `pnpm dev:mobile:android:device` / `expo run:android` to install a development build.
  iOS still uses the `expo-camera` preview until the same native path ships there.
- Account deletion, EAS development/preview/production profiles, and Jest / React Native
  Testing Library coverage. A Maestro guest flow is committed but still uses earlier
  Home/setup copy.
- Original flat geometric people illustrations for the welcome and reusable movement-family
  cards, plus a code-native front/back anatomy map whose regions are selectable and whose
  highlights are driven by exercise muscle attributes rather than per-exercise body images.

The current client presentation contract is deliberately split: reviewed raster illustrations
communicate posture or equipment on welcome/detail surfaces, while compact discovery and
collection rows use native vector marks. No route should render a blank thumbnail while waiting
for an optional bitmap asset.

## Session Setup and Multi-Exercise Flow

Workout setup (`apps/mobile/src/app/session/setup.tsx`) reviews remaining planned items
before the first or next movement starts.

- Remaining items are a horizontal carousel with a narrow peek of the next card. Dots
  under the card change pages; there are no previous/next arrows.
- Each exercise card sizes to its contents (name, sets, reps, rest chips). Page count
  (`1 of N`) stays in the header with a progress bar when more than one item remains.
- Sets and reps use plus/minus steppers (1–5 and 1–50). Rest uses 30/45/60/90 second
  chips. Planned items persist through store `updateWorkoutItem`; a solo exercise keeps
  local state.
- Form feedback is a custom on/off toggle in the same row as the camera icon and label.
  It is an accessible switch (`accessibilityRole="switch"`), not React Native `Switch`,
  so height and alignment match the camera row.
- A start preview between that toggle and the primary button names the first remaining
  movement, its first instruction cue, remaining estimated time, and the names that
  follow. Leftover height is used for that context, not empty canvas.
- **Start workout** / **Continue workout** always begins the first remaining item
  (`pages[0]` / current `itemIndex`), not the card the user is looking at.
- After complete, a planned workout with another item routes back to setup for that
  next item. **End workout** writes guest history and, in live UUID sessions, skips
  remaining children then completes the workout session.
- Review back uses `router.replace('/(tabs)/workout')`. Setup back uses
  `router.replace` to the workout review when a plan id is present, otherwise the
  Workout tab. Analysis back also replaces to the Workout tab. Do not use
  `router.back()` / `GO_BACK` for those exits.

Shared helpers live in `apps/mobile/src/lib/sessionFlow.ts` (`parseNonNegativeInt`,
`compactSearchParams`, `currentWorkoutItem`, `nextWorkoutItem`) and are covered by
`sessionFlow.test.ts`. Live create/resume/complete/skip helpers live in
`sessionSync.ts` and run only when the workout id is a UUID or a `workoutSessionId`
already exists. The local recommended plan id is `guest-workout-1`.

Guest equipment **None** implies a stable chair. `buildGuestWorkout` can return up to
four compatible chair-based exercises and excludes band/wall-only work unless that
gear was selected. Persisted guest plans migrate to this planner at store version 2.

Onboarding is welcome plus six stepped screens (goals, movement, preferences,
equipment, accessibility, summary). Onboarding back also uses `router.replace` to the
previous step.

The Home brand header includes a notifications control. It does not open a
notifications product; that remains out of scope.

The committed Maestro guest flow under `apps/mobile/.maestro` still asserts earlier
Home/setup copy and is not yet a reliable check of the carousel setup.

Run the client and focused checks with:

```text
pnpm dev:mobile
pnpm dev:mobile:ios
pnpm dev:mobile:android
pnpm dev:mobile:android:device
pnpm test:mobile
pnpm --filter @peddie/mobile build
```

`pnpm dev:mobile` starts Metro. `pnpm dev:mobile:ios` compiles a development client
(`expo run:ios`) and installs it on a simulator; Expo Go cannot load `expo-dev-client`
or the pose module. The Expo tools floating button is hidden in development so it does
not cover product controls; shake still opens the developer menu. `pnpm dev:mobile:android` is also a native run. Use
`pnpm dev:mobile:android:device` on a connected Android phone. The pose model is
downloaded into module assets at compile time, not at runtime. iOS pose remains a stub
(`isAvailable() === false`) until the Android camera pass lands. Xcode 26.3 needs the
committed `expo-modules-jsi` `Swift.abs` patch documented in
[deployment and operations](08-deployment-and-operations.md).

The iOS and Android export gate succeeds without private environment variables. Physical
devices must use a reachable API URL rather than `localhost`. The Android pose module is
in the repository; a physical-device camera pass, signed app-store artifacts, hosted
live-mode acceptance, and traffic inspection remain release gates because they require a
development build, a physical Android device, hosted credentials, or platform tooling not
fully exercised in Expo Go.
