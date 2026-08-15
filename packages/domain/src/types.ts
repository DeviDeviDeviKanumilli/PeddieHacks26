export const COMPATIBILITY_ENGINE_VERSION = 'compatibility-v1';
export const GENERATION_ENGINE_VERSION = 'generation-v1';

export type BodyRegionState = 'neutral' | 'focus' | 'limited' | 'avoid';
export type CapabilityState = 'unknown' | 'available' | 'limited' | 'avoid';
export type DemandLevel = 'minimal' | 'moderate' | 'high';
export type BodyInvolvement = 'primary' | 'secondary' | 'stabilizing';
export type IntensityPreference = 'low' | 'standard' | 'high';
export type CompatibilityStatus = 'compatible' | 'caution' | 'incompatible';
export type ReasonSeverity = 'info' | 'warning' | 'conflict';

export interface BodyDemand {
  readonly regionId: string;
  readonly involvement: BodyInvolvement;
  readonly demand: DemandLevel;
}

export interface CapabilityDemand {
  readonly capabilityId: string;
  readonly demand: DemandLevel;
  readonly required: boolean;
}

export interface EquipmentOption {
  readonly equipmentId: string;
  readonly mode: 'required' | 'optional';
  readonly orGroup?: string;
}

export interface ExercisePrescription {
  readonly sets: number;
  readonly reps?: number;
  readonly holdSeconds?: number;
  readonly restSeconds: number;
}

export interface ExerciseCandidate {
  readonly id: string;
  readonly slug: string;
  readonly familyKey: string;
  readonly name: string;
  readonly category: 'strength' | 'mobility' | 'balance' | 'cardio';
  readonly position: 'seated' | 'standing' | 'floor' | 'kneeling';
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly active: boolean;
  readonly defaultPrescription: ExercisePrescription;
  readonly estimatedSecondsPerSet: number;
  readonly bodyDemands: readonly BodyDemand[];
  readonly capabilityDemands: readonly CapabilityDemand[];
  readonly equipmentOptions: readonly EquipmentOption[];
  readonly primaryRegionIds: readonly string[];
  readonly goalIds: readonly string[];
  readonly trackingProfileKey?: string;
}

export interface MovementProfile {
  readonly version: number;
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
  readonly relatedId?: string;
  readonly message: string;
}

export interface CompatibilityResult {
  readonly exerciseId: string;
  readonly exerciseSlug: string;
  readonly status: CompatibilityStatus;
  readonly score: number;
  readonly engineVersion: string;
  readonly reasons: readonly CompatibilityReason[];
}

export interface CompatibilityOptions {
  readonly equipmentIds?: readonly string[];
  readonly intensityPreference?: IntensityPreference;
  readonly trackingRequired?: boolean;
}

export interface RankingRequest {
  readonly profile: MovementProfile;
  readonly candidates: readonly ExerciseCandidate[];
  readonly primaryRegionIds?: readonly string[];
  readonly secondaryRegionIds?: readonly string[];
  readonly goalIds?: readonly string[];
  readonly equipmentIds?: readonly string[];
  readonly intensityPreference?: IntensityPreference;
  readonly previousExerciseFamilyKeys?: readonly string[];
  readonly previousPrimaryRegionIds?: readonly string[];
}

export interface RankedExercise {
  readonly exercise: ExerciseCandidate;
  readonly compatibility: CompatibilityResult;
  readonly rankScore: number;
}

export interface GenerationRequest {
  readonly profile: MovementProfile;
  readonly candidates: readonly ExerciseCandidate[];
  readonly durationMinutes: number;
  readonly primaryRegionIds?: readonly string[];
  readonly secondaryRegionIds?: readonly string[];
  readonly goalIds?: readonly string[];
  readonly equipmentIds?: readonly string[];
  readonly intensityPreference?: IntensityPreference;
  readonly previousExerciseFamilyKeys?: readonly string[];
  readonly previousPrimaryRegionIds?: readonly string[];
}

export interface GeneratedWorkoutItem {
  readonly position: number;
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
  readonly totalEstimatedSeconds: number;
  readonly items: readonly GeneratedWorkoutItem[];
}

export class InsufficientCompatibleExercisesError extends Error {
  readonly code = 'insufficientCompatibleExercises';
  readonly requestedCount: number;
  readonly compatibleCount: number;
  readonly suggestions: readonly string[];

  constructor(requestedCount: number, compatibleCount: number, suggestions: readonly string[]) {
    super('There are not enough compatible exercises for this request.');
    this.name = 'InsufficientCompatibleExercisesError';
    this.requestedCount = requestedCount;
    this.compatibleCount = compatibleCount;
    this.suggestions = suggestions;
  }
}
