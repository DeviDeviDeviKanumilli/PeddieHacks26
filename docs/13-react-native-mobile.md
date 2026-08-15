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
devices must use a reachable API URL rather than `localhost`. The production pose model,
signed app-store artifacts, hosted live-mode acceptance, Android device pass, and traffic
inspection remain release gates because they require external credentials, model assets,
or platform tooling not stored in this repository.
