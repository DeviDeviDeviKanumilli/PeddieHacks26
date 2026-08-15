# React Native Mobile Application

## Product platform

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

Onboarding, exercise details, workout review, swaps, camera setup, active exercise, rest,
completion, and analysis use native stack or modal navigation. The tab bar is hidden
during active workouts.

## Mobile architecture

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

The mobile client must support onboarding, movement-profile editing, exercise discovery,
compatibility explanations, reviewed exercise details, workout generation and editing,
guided sessions, pause/rest behavior, completion, analysis, progress, history, and account
deletion.

## Camera and pose boundary

Camera use is optional. Permission is requested only after a user action, and every
camera-assisted route provides an equally prominent path that continues without tracking.
The camera session stops when the user leaves the flow or the application backgrounds.

Pose inference runs on-device. Raw video, still images, audio, frames, landmarks, and
coordinates never enter an API request and are never persisted. The client may upload
only the allowlisted derived metrics defined in `packages/contracts`.

The first mobile milestone may use a clearly labeled deterministic tracker in guest mode.
Authenticated mode must not persist simulated form measurements. Production tracking is
implemented behind a native module that emits rep metrics and known feedback codes rather
than raw landmarks.

## On-device pose integration

The shipped client shows an `expo-camera` preview and a no-camera path. Guest tracking
still increments reps on a timer labeled **Simulated guest tracking**. Live mode uploads
counted-rep records only through `buildCountedRepMetrics`. Neither path runs pose
inference. The desktop Python lab under `model/` is already merged to `main`; it does
not run inside the app.

Expo Go cannot load MediaPipe or a bundled `.task` model. Production tracking requires
`expo-dev-client` and an EAS **development** build. The module must own a single camera
session for setup and the active workout, bundle `pose_landmarker_lite.task` in the app
(do not download it at runtime), and stop inference on unmount, navigation away, or
backgrounding.

Keep this split:

- Native: camera frames, MediaPipe Pose Landmarker, joint visibility, and joint angles.
- TypeScript: the `exercise_analyzer.py` state machine (target then return angle,
  bilateral reps, sets/rest, ROM). Port it with the existing Python tests as the oracle.
- JavaScript/API: allowlisted `RepMetric` fields and known `feedbackCodes` only.

Never emit landmark coordinates, frames, images, or audio to JavaScript for persistence
or to the API. If the native module is absent, keep the labeled guest simulation; live
mode must not persist simulated form, ROM, or fatigue values. Skip the pose module when
the exercise has no tracking profile.

Calibrate six client recipes rather than training a new pose model. Seed data currently
reuses one ROM window (`30–140°`) and tempo (`2–6s`) for every tracked exercise, and the
Python camera loop defaults to elbow landmarks. Each tracking key needs its own joints,
target/return angles, and limb rule:

| Tracking key | Starting joint recipe |
| --- | --- |
| `seated-biceps-curl-v1` | elbows `11-13-15` / `12-14-16` (already in `model/main.py`) |
| `seated-resistance-band-row-v1` | elbows or shoulders |
| `seated-march-v1` | hips `23-25-27` / `24-26-28` |
| `seated-knee-extension-v1` | knees |
| `sit-to-stand-v1` | hip and knee |
| `wall-push-up-v1` | elbows or shoulders |

The first physical test device is Android, so ship Android first: development build on
that phone, then biceps-curl tracking, then calibrate detection. iOS remains required
for release, but it is not the first hardware gate. Work that does not need the phone
includes adding `expo-dev-client`, porting the analyzer and tests, writing the curl
recipe, scaffolding the Android MediaPipe module, and compiling the APK on a machine
that has the Android SDK. The phone is for install, camera permission, framing, and
calibration. Physical devices must use a LAN IP or hosted API origin, not `localhost`.

If lite detection is weak, try a larger off-the-shelf MediaPipe pose model. Do not train
a custom pose network for this milestone.

## Accessibility

- Meet or exceed 44-point iOS and 48dp Android touch targets.
- Support Dynamic Type, screen readers, reduced motion, high contrast, and one-handed use.
- Never communicate movement status, compatibility, or progress through color alone.
- Provide visual, spoken, and haptic feedback according to user preferences.
- Give the interactive body map an equivalent searchable/list-based control.
- Keep live coaching brief and present one actionable correction at a time.

## Mobile delivery and acceptance

- Provide iOS and Android development, preview, and production build profiles.
- Run React Native component tests and Maestro acceptance flows on both platforms.
- Verify native back behavior, deep links, permission denial, permission revocation,
  foreground/background transitions, camera cleanup, offline recovery, and token expiry.
- Inspect mobile network traffic and prove that no raw camera or landmark payload leaves
  the device.
- Accept the release only when a user can add a movement constraint, see recommendations
  visibly adapt, understand the reason, complete a camera-optional workout, review
  metrics-first analysis, and see progress in guest and authenticated modes.

## Implemented mobile milestone

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
- Profile and accessibility-settings synchronization, deterministic live workout
  generation, full public catalog hydration, reviewed exercise sources, and live progress.
- Camera permission disclosure, camera setup, equally prominent no-camera continuation,
  compact in-session tracking-off status, nearby manual rep guidance, pause, timed rest, early
  completion, and metrics-first analysis.
- Authenticated session lifecycle calls that submit only counted-rep derived records;
  simulated guest form values are never persisted to the backend.
- Account deletion, EAS development/preview/production profiles, Jest and React Native
  Testing Library coverage, and a committed Maestro guest acceptance flow.
- Original flat geometric people illustrations for the welcome and reusable movement-family
  cards, plus a code-native front/back anatomy map whose regions are selectable and whose
  highlights are driven by exercise muscle attributes rather than per-exercise body images.

The current client presentation contract is deliberately split: reviewed raster illustrations
communicate posture or equipment on welcome/detail surfaces, while compact discovery and
collection rows use native vector marks. No route should render a blank thumbnail while waiting
for an optional bitmap asset.

Run the client and focused checks with:

```text
pnpm dev:mobile
pnpm dev:mobile:ios
pnpm dev:mobile:android
pnpm test:mobile
pnpm --filter @peddie/mobile build
```

The iOS and Android export gate succeeds without private environment variables. Physical
devices must use a reachable API URL rather than `localhost`. The production pose native
module, signed app-store artifacts, hosted live-mode acceptance, Android device camera
pass, and traffic inspection remain release gates because they require a development
build, a physical Android device, hosted credentials, or platform tooling not
fully exercised in Expo Go.
