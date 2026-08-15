export type RegionState = 'neutral' | 'focus' | 'limited' | 'avoid';
export type Compatibility = 'compatible' | 'caution' | 'incompatible';
export type AppMode = 'guest' | 'live';

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
  equipment: string[];
  instructions: string[];
  safetyCues: string[];
  adaptations: string[];
  compatibility: Compatibility;
  compatibilityReason: string;
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
};
