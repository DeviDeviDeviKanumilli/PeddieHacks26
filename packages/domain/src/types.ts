// shared types for both engines plus session/analytics. keep this file import-free.
// bump these when the ranking or scoring rules change so clients can tell which engine ran.
export const COMPATIBILITY_ENGINE_VERSION = 'compatibility-v1';
export const GENERATION_ENGINE_VERSION = 'generation-v1';

// closed vocabularies. if you add a state, update contracts and the engines in the same change.
export type BodyRegionState = 'neutral' | 'focus' | 'limited' | 'avoid';
export type CapabilityState = 'unknown' | 'available' | 'limited' | 'avoid';
// body: missing key => neutral. capability: missing key => unknown. do not mix those defaults.
export type DemandLevel = 'minimal' | 'moderate' | 'high'; // severity only. does not mean "unused".
export type BodyInvolvement = 'primary' | 'secondary' | 'stabilizing'; // stabilizing + avoid can be a warning.
export type IntensityPreference = 'low' | 'standard' | 'high'; // caps catalog difficulty, not a rank multiplier.
export type CompatibilityStatus = 'compatible' | 'caution' | 'incompatible';
export type ReasonSeverity = 'info' | 'warning' | 'conflict'; // only conflict fails. info never changes score.

export interface BodyDemand {
  readonly regionId: string;
  readonly involvement: BodyInvolvement;
  readonly demand: DemandLevel;
}

export interface CapabilityDemand {
  readonly capabilityId: string;
  readonly demand: DemandLevel;
  readonly required: boolean; // false = nice-to-have. avoid is still a warning, not a skip.
}

export interface EquipmentOption {
  readonly equipmentId: string;
  readonly mode: 'required' | 'optional';
  readonly orGroup?: string; // same group = alternatives. missing the group means "this item only".
}

export interface ExercisePrescription {
  readonly sets: number;
  readonly reps?: number; // reps xor hold. generation fills holdSeconds if both are missing.
  readonly holdSeconds?: number;
  readonly restSeconds: number; // between sets, not after the last one.
}

export interface ExerciseCandidate {
  readonly id: string;
  readonly slug: string;
  readonly familyKey: string; // used to avoid stacking two curls in a row, not for display.
  readonly name: string;
  readonly category: 'strength' | 'mobility' | 'balance' | 'cardio';
  readonly position: 'seated' | 'standing' | 'floor' | 'kneeling';
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly active: boolean; // false is a hard fail. the curated list keeps this true.
  readonly defaultPrescription: ExercisePrescription;
  readonly estimatedSecondsPerSet: number;
  readonly bodyDemands: readonly BodyDemand[];
  readonly capabilityDemands: readonly CapabilityDemand[];
  readonly equipmentOptions: readonly EquipmentOption[];
  readonly primaryRegionIds: readonly string[];
  readonly goalIds: readonly string[];
  readonly trackingProfileKey?: string; // omit this if the exercise is manual-only. do not invent a key.
}

export interface MovementProfile {
  readonly version: number; // profile document version, not compatibility-v1.
  readonly bodyRegions: Readonly<Record<string, BodyRegionState>>;
  readonly capabilities: Readonly<Record<string, CapabilityState>>;
  readonly equipmentIds: readonly string[];
  readonly goalIds: readonly string[];
  readonly intensityPreference: IntensityPreference;
}

export interface CompatibilityReason {
  readonly code:
    | 'avoided_body_region'
    | 'limited_body_region'
    | 'unknown_required_capability'
    | 'avoided_required_capability'
    | 'limited_required_capability'
    | 'missing_required_equipment'
    | 'inactive_exercise'
    | 'intensity_exceeded'
    | 'tracking_not_supported';
  readonly severity: ReasonSeverity;
  readonly relatedId?: string; // region, capability, or equipment group. omit when the reason is global.
  readonly message: string;
}

export interface CompatibilityResult {
  readonly exerciseId: string;
  readonly exerciseSlug: string;
  readonly status: CompatibilityStatus;
  readonly score: number; // 0 on conflict. otherwise 100 minus 20 per warning.
  readonly engineVersion: string;
  readonly reasons: readonly CompatibilityReason[]; // all of them, even after the first conflict.
}

export interface CompatibilityOptions {
  readonly equipmentIds?: readonly string[]; // overrides the profile for this lookup only
  readonly intensityPreference?: IntensityPreference;
  readonly trackingRequired?: boolean; // warning, not a hard fail. missing a recipe is still usable.
}

// ranking and generation share most fields. duration is the only generation-only input.
export interface RankingRequest {
  readonly profile: MovementProfile;
  readonly candidates: readonly ExerciseCandidate[];
  readonly primaryRegionIds?: readonly string[];
  readonly secondaryRegionIds?: readonly string[];
  readonly goalIds?: readonly string[]; // request goals, not only the profile's. empty means no goal bonus.
  readonly equipmentIds?: readonly string[];
  readonly intensityPreference?: IntensityPreference;
  readonly previousExerciseFamilyKeys?: readonly string[]; // variety penalty only, never a hard filter.
  readonly previousPrimaryRegionIds?: readonly string[];
}

export interface RankedExercise {
  readonly exercise: ExerciseCandidate;
  readonly compatibility: CompatibilityResult;
  readonly rankScore: number; // 0 means incompatible. ranking still returns the row.
}

export interface GenerationRequest {
  readonly profile: MovementProfile;
  readonly candidates: readonly ExerciseCandidate[];
  readonly durationMinutes: number; // integer 5-45. ranking does not take this; generation does.
  readonly primaryRegionIds?: readonly string[];
  readonly secondaryRegionIds?: readonly string[];
  readonly goalIds?: readonly string[];
  readonly equipmentIds?: readonly string[];
  readonly intensityPreference?: IntensityPreference;
  readonly previousExerciseFamilyKeys?: readonly string[];
  readonly previousPrimaryRegionIds?: readonly string[];
}

export interface GeneratedWorkoutItem {
  readonly position: number; // 1-based for clients. internal builders may start at 0 then rewrite.
  readonly exerciseId: string;
  readonly exerciseSlug: string;
  readonly sets: number;
  readonly reps?: number;
  readonly holdSeconds?: number;
  readonly restSeconds: number;
  readonly estimatedSeconds: number;
  readonly rankScore: number;
  readonly compatibility: CompatibilityResult;
}

export interface GeneratedWorkout {
  readonly engineVersion: string;
  readonly requestedDurationMinutes: number;
  readonly totalEstimatedSeconds: number; // after set stretching. may miss the exact minute mark.
  readonly items: readonly GeneratedWorkoutItem[];
}

// thrown instead of padding a plan with incompatible work. catch this at the route, do not swallow it.
export class InsufficientCompatibleExercisesError extends Error {
  readonly code = 'insufficientCompatibleExercises';
  readonly requestedCount: number;
  readonly compatibleCount: number;
  readonly suggestions: readonly string[]; // stable copy for the client. do not interpolate counts into these.

  constructor(requestedCount: number, compatibleCount: number, suggestions: readonly string[]) {
    super('There are not enough compatible exercises for this request.');
    this.name = 'InsufficientCompatibleExercisesError';
    this.requestedCount = requestedCount;
    this.compatibleCount = compatibleCount;
    this.suggestions = suggestions;
  }
}
