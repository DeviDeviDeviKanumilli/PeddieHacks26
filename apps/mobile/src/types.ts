// guest-shaped types. live api payloads get mapped in adapters (exercises, profilesync).

export type RegionState = 'neutral' | 'focus' | 'limited' | 'avoid';
export type Compatibility = 'compatible' | 'caution' | 'incompatible';
// guest = on-device store only. live = supabase auth + fastify, still no raw media.
export type AppMode = 'guest' | 'live';
export type MuscleRole = 'primary' | 'secondary' | 'stabilizer';
export type MuscleRegionId =
  | 'shoulders'
  | 'chest'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'traps'
  | 'lats'
  | 'upper-back'
  | 'lower-back'
  | 'core'
  | 'obliques'
  | 'hip-flexors'
  | 'glutes'
  | 'quadriceps'
  | 'hamstrings'
  | 'calves'
  | 'ankles-feet';
// four illustration families so new catalog rows reuse art instead of shipping photos.
export type ExerciseVisualKey =
  | 'seated-strength'
  | 'seated-pull'
  | 'seated-mobility'
  | 'wall-supported';

export type MuscleActivation = {
  id: MuscleRegionId;
  role: MuscleRole;
  intensity: 1 | 2 | 3 | 4 | 5;
};

export type MovementProfile = {
  goals: string[];
  regions: Record<string, RegionState>;
  capabilities: Record<string, RegionState>;
  equipment: string[];
  accessibility: string[];
  onboardingComplete: boolean;
};

export type Exercise = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  category: 'strength' | 'mobility' | 'balance' | 'cardio';
  position: 'seated' | 'standing' | 'floor' | 'kneeling';
  difficulty: number;
  sets: number;
  reps: number;
  restSeconds: number;
  muscles: string[];
  muscleActivations: MuscleActivation[];
  visualKey: ExerciseVisualKey;
  equipment: string[];
  instructions: string[];
  safetyCues: string[];
  adaptations: string[];
  compatibility: Compatibility;
  compatibilityReason: string;
  // catalog flag: a recipe exists. does not mean the camera is running.
  trackingSupported: boolean;
};

export type WorkoutItem = {
  id: string;
  exerciseSlug: string;
  sets: number;
  reps: number;
  restSeconds: number;
};

export type Workout = {
  id: string;
  title: string;
  durationMinutes: number;
  focus: string;
  items: WorkoutItem[];
};

export type WorkoutHistory = {
  id: string;
  title: string;
  completedAt: string;
  durationSeconds: number;
  exercises: number;
  reps: number;
  averageScore: number | null;
  // optional heatmap from on-device activations; never pose landmarks.
  muscleLoad?: Partial<Record<MuscleRegionId, number>>;
};
