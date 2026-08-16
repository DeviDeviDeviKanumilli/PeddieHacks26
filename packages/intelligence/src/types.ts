export const FEEDBACK_CODES = [
  'low_tracking_confidence',
  'tempo_too_slow',
  'range_of_motion_short',
  'target_position_missed',
  'movement_jerky',
  'stability_left',
  'stability_right',
] as const;

export type FeedbackCode = (typeof FEEDBACK_CODES)[number];

export const REGION_STATES = ['neutral', 'focus', 'limited', 'avoid'] as const;
export type RegionState = (typeof REGION_STATES)[number];

export const POSITIONS = ['seated', 'standing', 'floor', 'kneeling'] as const;
export type Position = (typeof POSITIONS)[number];

export const EQUIPMENT_TOKENS = ['chair', 'wall', 'band', 'dumbbells'] as const;
export type EquipmentToken = (typeof EQUIPMENT_TOKENS)[number];

export const SESSION_PHASES = ['setup', 'active', 'rest', 'complete'] as const;
export type SessionPhase = (typeof SESSION_PHASES)[number];

export const TOOL_NAMES = [
  'profile.read',
  'feedback.emit',
  'speech.speak',
  'haptics.pulse',
  'adaptation.propose',
  'progress.record_set',
  'progress.record_exercise',
  'profile.note_completion',
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export type AccessibilityFlags = {
  largerText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  spokenFeedback: boolean;
  hapticFeedback: boolean;
  oneHanded: boolean;
};

export type MovementProfile = {
  goals: readonly string[];
  regions: Readonly<Record<string, RegionState>>;
  standing: RegionState;
  equipment: readonly EquipmentToken[];
  accessibility: AccessibilityFlags;
};

export type CatalogExercise = {
  id: string;
  name: string;
  position: Position;
  equipment: readonly EquipmentToken[];
  equipmentOrGroup: boolean;
  impact: 'none' | 'low' | 'jump';
  primaryRegion: string;
  defaultSets: number;
  defaultReps: number;
  defaultRestSeconds: number;
};

export type CompatibilityStatus = 'compatible' | 'caution' | 'incompatible';

export type CompatibilityResult = {
  status: CompatibilityStatus;
  reasonCode: string;
};

export type WorkoutItem = {
  exerciseId: string;
  sets: number;
  reps: number;
  restSeconds: number;
};

export type AllowedPoseSample = {
  angleDeg: number;
  confidence: number;
  nativeInference: boolean;
  atMs: number;
};

export type FeatureSample = {
  angleDeg: number;
  velocityDegPerSec: number;
  rangeOfMotionDeg: number;
  stability: number;
  confidence: number;
  atMs: number;
};

export type TrackerState =
  | 'idle'
  | 'seeking_target'
  | 'seeking_return'
  | 'rest'
  | 'exercise_complete';

export type ExerciseRecipe = {
  exerciseId: string;
  targetAngleDeg: number;
  returnAngleDeg: number;
  confidenceGate: number;
  minCycleMs: number;
  maxCycleMs: number;
  minRomDeg: number;
  maxStability: number;
  minVelocity: number;
  maxVelocity: number;
  repsPerSet: number;
  sets: number;
};

export type MotionEventType =
  | 'feature_sample'
  | 'rep_accepted'
  | 'set_complete'
  | 'rest_started'
  | 'exercise_complete'
  | 'issue_code'
  | 'tracking_unavailable';

export type MotionEvent = {
  type: MotionEventType;
  atMs: number;
  exerciseId: string;
  setIndex?: number;
  repIndex?: number;
  payload: Readonly<Record<string, unknown>>;
};

export type ToolCall = {
  tool: ToolName;
  callId: string;
  arguments: Readonly<Record<string, unknown>>;
};

export type ToolRejectionCode =
  | 'unknown_tool'
  | 'invalid_arguments'
  | 'phase_forbidden'
  | 'duplicate_call'
  | 'media_field_present';

export type ToolDecision =
  | { ok: true; call: ToolCall }
  | { ok: false; code: ToolRejectionCode; callId: string };

export type OrchestratorInput = {
  phase: SessionPhase;
  prescription: WorkoutItem;
  recipe: ExerciseRecipe;
  event: MotionEvent;
  accessibility: AccessibilityFlags;
  nativeInference: boolean;
};

export const FORBIDDEN_PAYLOAD_KEYS = [
  'landmarks',
  'keypoints',
  'coordinates',
  'points',
  'image',
  'frame',
  'video',
  'audio',
  'uri',
  'note',
  'comment',
  'feedback',
] as const;

export const ORCHESTRATOR_PARAMETER_BUDGET = 125_000_000;

export const REST_OPTIONS = [30, 45, 60, 90] as const;
