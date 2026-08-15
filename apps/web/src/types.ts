export type CompatibilityStatus = 'compatible' | 'caution' | 'incompatible';

export type Exercise = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  category: 'strength' | 'mobility' | 'cardio' | 'balance';
  position: 'seated' | 'standing' | 'floor' | 'supported-standing';
  difficulty: 1 | 2 | 3 | 4 | 5;
  defaultReps: number;
  defaultSets: number;
  restSeconds: number;
  trackingSupported: boolean;
  bodyRegions: string[];
  muscles: string[];
  equipment: string[];
  instructions: string[];
  tips: string[];
  compatibility: CompatibilityStatus;
  cautionReasons?: string[];
  adaptationSlug?: string;
  image?: string;
};

export type ConstraintMode = 'focus' | 'avoid';

/**
 * The four states a body region can hold on the movement map. `none` is the implicit
 * default and is never persisted — a region is stored only once the user marks it.
 */
export type RegionStatus = 'none' | 'minor' | 'pain' | 'focus';

export type BodySide = 'front' | 'back';

export type BodyRegion = {
  id: string;
  label: string;
  side: BodySide;
  /** Percentage coordinates of the region's centre within the body diagram. */
  x: number;
  y: number;
};

export type GoalId =
  | 'build-strength'
  | 'improve-mobility'
  | 'increase-endurance'
  | 'lose-weight'
  | 'general-fitness'
  | 'rehab-recovery';

export type MovementStyleId =
  | 'strength-training'
  | 'yoga-mobility'
  | 'hiit-cardio'
  | 'pilates'
  | 'bodyweight'
  | 'sports-athletic';

export type EquipmentId =
  | 'dumbbells'
  | 'kettlebells'
  | 'resistance-bands'
  | 'barbell'
  | 'pull-up-bar'
  | 'bench'
  | 'cable-machine'
  | 'none';

export type AccessibilityNeedId =
  | 'visual-impairment'
  | 'hearing-impairment'
  | 'reduced-mobility'
  | 'one-handed-use'
  | 'cognitive-considerations';

export type AccessibilityPreferences = {
  needs: AccessibilityNeedId[];
  notes: string;
};

export type MovementProfile = {
  focusRegions: string[];
  avoidRegions: string[];
  equipment: string[];
  goals: string[];
  version: number;
  /** Per-region markings from the movement map, keyed by region id. */
  regions: Record<string, RegionStatus>;
  regionNotes: string;
  goalIds: GoalId[];
  styles: MovementStyleId[];
  equipmentIds: EquipmentId[];
  accessibility: AccessibilityPreferences;
  /** False until the user finishes onboarding, which gates the profile-summary route. */
  onboardingComplete: boolean;
};

export type UserProfile = {
  displayName: string;
  email: string;
};

export type SessionStatus = 'idle' | 'building' | 'active' | 'paused' | 'resting' | 'complete';

export type WorkoutSessionState = {
  status: SessionStatus;
  exerciseSlug: string;
  set: number;
  totalSets: number;
  reps: number;
  targetReps: number;
  elapsedSeconds: number;
  restSeconds: number;
  trackingEnabled: boolean;
  formScore: number;
  rangeOfMotion: number;
};

export type WorkoutHistoryItem = {
  id: string;
  title: string;
  category: 'strength' | 'mobility' | 'core' | 'cardio' | 'balance';
  completedAt: string;
  completedReps: number;
  targetReps: number;
  durationSeconds: number;
  formScore: number;
  favorite?: boolean;
  trackingEnabled?: boolean;
};

export type ProgressSummary = {
  totalSeconds: number;
  exercisesCompleted: number;
  totalReps: number;
  totalSets: number;
  bodyCoverage: number;
  averageFormScore: number;
  weeklyWorkouts: number;
  weeklySeconds: number;
  weeklyReps: number;
  weeklySets: number;
};

export type ApiMode = 'demo' | 'live';

export type WorkoutDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type WorkoutItem = {
  id: string;
  exerciseSlug: string;
  sets: number;
  reps: number;
  restSeconds: number;
  /** Set when this item replaced another, so the plan can explain itself. */
  swappedFromSlug?: string;
  swapReason?: string;
};

export type WorkoutPlan = {
  id: string;
  title: string;
  summary: string;
  difficulty: WorkoutDifficulty;
  estimatedMinutes: number;
  focusAreas: string[];
  items: WorkoutItem[];
  /** True for the profile-derived recommendation rather than a user-built plan. */
  recommended: boolean;
};

export type WorkoutBuilderCriteria = {
  muscleGroups: string[];
  movementPatterns: string[];
  equipment: EquipmentId[];
  difficulty: WorkoutDifficulty;
};

export type ExerciseAlternative = {
  slug: string;
  name: string;
  reason: string;
  image?: string;
  compatibility: CompatibilityStatus;
};

export type WorkoutCompletionSummary = {
  workoutId: string;
  title: string;
  totalSeconds: number;
  exercisesCompleted: number;
  totalExercises: number;
  estimatedCalories: number;
  averageFormScore: number;
  completedAt: string;
};

export type ExerciseCollection = {
  id: string;
  title: string;
  workoutCount: number;
  category: Exercise['category'];
};

export type DailyTip = {
  id: string;
  title: string;
  body: string;
};
