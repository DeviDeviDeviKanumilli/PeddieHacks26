# Visual Assets and Anatomy System

## Purpose

AdaptFit separates expressive people artwork from functional anatomy. Original raster
illustrations make the mobile experience welcoming, while a deterministic SVG component
shows movement constraints and muscle emphasis. Exercise eligibility never depends on the
raster images.

## Illustration Library

The generated PNG assets live under `apps/mobile/assets/illustrations`:

- `welcome-inclusive-flat.png`: the inclusive welcome group.
- `seated-strength-flat.png`: reusable seated-load artwork.
- `seated-band-row-flat.png`: reusable seated-pull and wheelchair artwork.
- `seated-mobility-flat.png`: reusable seated mobility/cardio artwork.
- `wall-supported-flat.png`: reusable supported-standing artwork.

The images use flat geometric product-illustration styling with simplified shapes, solid
color blocks, and preserved exercise mechanics. They contain no text, logos, or medical
claims. `apps/mobile/src/lib/exerciseVisuals.ts` is the only asset registry consumed by
screens.

Each exercise has a `visualKey`, not a unique image requirement. New exercises select one
of the existing movement-family keys through `inferVisualKey`; a new asset is justified
only when no current family communicates the posture or equipment safely.

## Movement Marks

Compact exercise and collection thumbnails use the code-native
`apps/mobile/src/components/MovementMark.tsx` component. It maps the four exercise categories to
recognizable strength, mobility, cardio, and balance glyphs and applies the category tone from one
shared registry. Because these marks render as native vectors, list rows never depend on a bitmap
finishing its load before the thumbnail becomes visible. Collection rows may override the tone to
keep adjacent collections visually distinct while retaining the mark that describes their content.

The current mark registry is:

| Category | Mark | Tone |
| --- | --- | --- |
| Strength | Dumbbell | Lavender/violet |
| Mobility | Accessibility figure | Teal/green |
| Cardio | Heart pulse | Coral/red |
| Balance | Balance scale | Amber/yellow |

The earlier generated files under `apps/mobile/assets/movement-marks` are retained as design
experiments, but the live list and collection UI must use `MovementMark` rather than importing
those bitmaps. This keeps thumbnails reusable, accessible, and independent of image load timing.

## Canonical Muscle Attributes

The native `Exercise` model includes `muscleActivations` entries with:

- `id`: a stable canonical muscle-region ID.
- `role`: `primary`, `secondary`, or `stabilizer`.
- `intensity`: a relative integer from 1 through 5.

`apps/mobile/src/lib/anatomy.ts` maps reviewed API muscle IDs and local labels into the
canonical regions. API roles and intensities are retained. Local guest records derive a
deterministic primary/supporting hierarchy from their ordered reviewed muscle labels.

The intensity is exercise emphasis, not measured exertion, pain, diagnosis, or a clinical
score. UI copy must preserve that distinction.

## Reusable Anatomy Component

`apps/mobile/src/components/AnatomyMap.tsx` draws front and back figures entirely with
React Native SVG paths. Each figure is assembled from connected head, neck, torso,
pelvis, limb, hand, and foot contours, with muscle-specific overlays layered on top;
there are no screenshot assets, detached joint blocks, or image-specific variants to
maintain. White gutters divide traps, delts, pecs, a six-pack abdomen, obliques, lats,
upper and lower back, glutes, arms, split thighs, calves, and ankles/feet. Canonical
region IDs include `traps`, `lats`, and `obliques`. Upper-back emphasis also lights traps
and lats on the map; core emphasis also lights obliques. Text chips still list only the
labels present on the exercise. The component supports two data modes:

1. Movement-profile mode colors each tappable region as focus, limited, avoid, or neutral.
2. Muscle-emphasis mode colors canonical muscles with a lavender family by role (primary,
   supporting, stabilizing). Inactive segments stay light grey with white gutters.

The same component is used for onboarding/profile editing, exercise details, the Workout
tab recommendation preview, combined workout coverage, and progress. Workout-setup cards
use `MovementMark` plus the exercise name rather than a large anatomy canvas. It must not be
replaced by screenshots or a single flattened anatomy image.

The visual map always has a text equivalent. Profile editing retains labeled 52-point
buttons for each selectable region. Exercise and progress maps list highlighted muscle
names, roles, and intensity values so color is never the only signal.

## Workout and History Aggregation

`combineMuscleLoad` sums exercise intensities by canonical region. `activationsFromLoad`
normalizes those totals into relative primary, supporting, and stabilizing roles for a
multi-exercise workout or completed-history view. Guest workout history persists only
these small derived load values; it does not persist media, pose landmarks, or body images.

Hosted progress currently exposes aggregate activity rather than historical muscle-load
rows, so the live progress map uses locally completed session attributes until a reviewed
backend aggregate is added. It must not fabricate server-derived muscle history.

## Adding an Exercise

When adding a reviewed exercise:

1. Provide ordered muscle labels locally or reviewed `exercise_muscles` rows in Supabase.
2. Confirm every label resolves through `muscleIdsForLabel`; add a deliberate alias when
   the source uses a known synonym.
3. Select or infer a movement-family `visualKey`.
4. Verify the front/back map and text chips communicate the same primary/supporting roles.
5. Add a mapping test before releasing the catalog change.

## Image Generation Record

The built-in image-generation tool produced the project-bound raster assets. Prompts asked
for inclusive adults, structurally plausible mobility equipment, preserved exercise poses,
flat geometric vector-like shapes, AdaptFit navy/lavender/teal/coral colors, no text or
logos, and no photorealism. User-supplied screens were style and composition references;
they were not copied as application screenshots.
