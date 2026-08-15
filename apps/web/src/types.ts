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

export type MovementProfile = {
  focusRegions: string[];
  avoidRegions: string[];
  equipment: string[];
  goals: string[];
  version: number;
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
