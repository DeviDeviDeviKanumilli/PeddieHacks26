import type {
  AccessibilityNeedId,
  BodyRegion,
  EquipmentId,
  GoalId,
  MovementStyleId,
  RegionStatus,
  WorkoutDifficulty,
} from '../types';

/**
 * Shared vocabulary for the onboarding and profile-editing screens. Both the demo
 * fixtures and the live adapter resolve against these lists, so a label only ever
 * has to be written once.
 */

export type OptionDefinition<Id extends string> = {
  id: Id;
  label: string;
  description?: string;
};

export const goalOptions: ReadonlyArray<OptionDefinition<GoalId>> = [
  { id: 'build-strength', label: 'Build Strength', description: 'Progressive resistance work.' },
  {
    id: 'improve-mobility',
    label: 'Improve Mobility',
    description: 'Range of motion and control.',
  },
  {
    id: 'increase-endurance',
    label: 'Increase Endurance',
    description: 'Sustained effort over time.',
  },
  { id: 'lose-weight', label: 'Lose Weight', description: 'Higher-output, full-body sessions.' },
  { id: 'general-fitness', label: 'General Fitness', description: 'A balanced weekly mix.' },
  { id: 'rehab-recovery', label: 'Rehab / Recovery', description: 'Gentle, controlled movement.' },
];

export const movementStyleOptions: ReadonlyArray<OptionDefinition<MovementStyleId>> = [
  { id: 'strength-training', label: 'Strength Training' },
  { id: 'yoga-mobility', label: 'Yoga / Mobility' },
  { id: 'hiit-cardio', label: 'HIIT / Cardio' },
  { id: 'pilates', label: 'Pilates' },
  { id: 'bodyweight', label: 'Bodyweight' },
  { id: 'sports-athletic', label: 'Sports / Athletic' },
];

export const equipmentOptions: ReadonlyArray<OptionDefinition<EquipmentId>> = [
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'kettlebells', label: 'Kettlebells' },
  { id: 'resistance-bands', label: 'Resistance Bands' },
  { id: 'barbell', label: 'Barbell' },
  { id: 'pull-up-bar', label: 'Pull-up Bar' },
  { id: 'bench', label: 'Bench' },
  { id: 'cable-machine', label: 'Cable Machine' },
  { id: 'none', label: 'None' },
];

export const accessibilityOptions: ReadonlyArray<OptionDefinition<AccessibilityNeedId>> = [
  {
    id: 'visual-impairment',
    label: 'Visual Impairment',
    description: 'Larger text and higher contrast.',
  },
  {
    id: 'hearing-impairment',
    label: 'Hearing Impairment',
    description: 'Visual cues instead of audio.',
  },
  {
    id: 'reduced-mobility',
    label: 'Reduced Mobility',
    description: 'Seated and supported variations.',
  },
  { id: 'one-handed-use', label: 'One-Handed Use', description: 'Unilateral alternatives.' },
  {
    id: 'cognitive-considerations',
    label: 'Cognitive Considerations',
    description: 'Shorter cues, fewer steps.',
  },
];

/**
 * Region coordinates are percentages within the body diagram's viewBox, positioned to
 * sit over the matching part of the silhouette drawn in `BodyDiagram`.
 */
export const bodyRegions: readonly BodyRegion[] = [
  { id: 'neck', label: 'Neck', side: 'front', x: 50, y: 16.5 },
  { id: 'shoulders', label: 'Shoulders', side: 'front', x: 50, y: 21.5 },
  { id: 'chest', label: 'Chest', side: 'front', x: 50, y: 28 },
  { id: 'left-arm', label: 'Left Arm', side: 'front', x: 30.9, y: 33 },
  { id: 'right-arm', label: 'Right Arm', side: 'front', x: 69.1, y: 33 },
  { id: 'core', label: 'Core', side: 'front', x: 50, y: 45 },
  { id: 'hips', label: 'Hips', side: 'front', x: 50, y: 55.5 },
  { id: 'left-knee', label: 'Left Knee', side: 'front', x: 44.5, y: 78 },
  { id: 'right-knee', label: 'Right Knee', side: 'front', x: 55.5, y: 78 },
  { id: 'left-ankle', label: 'Left Ankle', side: 'front', x: 44.6, y: 93 },
  { id: 'right-ankle', label: 'Right Ankle', side: 'front', x: 55.4, y: 93 },
  { id: 'upper-back', label: 'Upper Back', side: 'back', x: 50, y: 26 },
  { id: 'lower-back', label: 'Lower Back', side: 'back', x: 50, y: 45 },
  { id: 'glutes', label: 'Glutes', side: 'back', x: 50, y: 55.5 },
  { id: 'left-hamstring', label: 'Left Hamstring', side: 'back', x: 44.5, y: 66 },
  { id: 'right-hamstring', label: 'Right Hamstring', side: 'back', x: 55.5, y: 66 },
  { id: 'left-calf', label: 'Left Calf', side: 'back', x: 44.6, y: 88 },
  { id: 'right-calf', label: 'Right Calf', side: 'back', x: 55.4, y: 88 },
];

export const regionStatusOrder: readonly RegionStatus[] = ['none', 'focus', 'minor', 'pain'];

export const regionStatusLabels: Readonly<Record<RegionStatus, string>> = {
  none: 'No issues',
  focus: 'Focus area',
  minor: 'Minor limitations',
  pain: 'Pain / Avoid',
};

export const difficultyOptions: ReadonlyArray<OptionDefinition<WorkoutDifficulty>> = [
  { id: 'beginner', label: 'Beginner', description: 'Foundational movements, longer rests.' },
  { id: 'intermediate', label: 'Intermediate', description: 'Standard loading and tempo.' },
  { id: 'advanced', label: 'Advanced', description: 'Higher volume and complexity.' },
];

export const muscleGroupOptions: readonly string[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Core',
  'Glutes',
  'Legs',
  'Full Body',
];

export const movementPatternOptions: readonly string[] = [
  'Push',
  'Pull',
  'Squat',
  'Hinge',
  'Carry',
  'Rotation',
];

const labelIndex = <Id extends string>(options: ReadonlyArray<OptionDefinition<Id>>) =>
  new Map(options.map((option) => [option.id, option.label]));

const goalLabels = labelIndex(goalOptions);
const styleLabels = labelIndex(movementStyleOptions);
const equipmentLabels = labelIndex(equipmentOptions);
const accessibilityLabels = labelIndex(accessibilityOptions);

export const goalLabel = (id: GoalId): string => goalLabels.get(id) ?? id;
export const movementStyleLabel = (id: MovementStyleId): string => styleLabels.get(id) ?? id;
export const equipmentLabel = (id: EquipmentId): string => equipmentLabels.get(id) ?? id;
export const accessibilityLabel = (id: AccessibilityNeedId): string =>
  accessibilityLabels.get(id) ?? id;

export const regionLabel = (id: string): string =>
  bodyRegions.find((region) => region.id === id)?.label ?? id;

/** Regions the user marked as `pain` are the ones a workout must route around. */
export const avoidRegionLabels = (regions: Record<string, RegionStatus>): string[] =>
  Object.entries(regions)
    .filter(([, status]) => status === 'pain')
    .map(([id]) => regionLabel(id));

export const focusRegionLabels = (regions: Record<string, RegionStatus>): string[] =>
  Object.entries(regions)
    .filter(([, status]) => status === 'focus')
    .map(([id]) => regionLabel(id));
