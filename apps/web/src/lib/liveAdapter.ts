import type {
  CompatibilityStatus,
  Exercise as UiExercise,
  MovementProfile as UiMovementProfile,
  ProgressSummary as UiProgressSummary,
  UserProfile as UiUserProfile,
  WorkoutHistoryItem as UiWorkoutHistoryItem,
} from '../types';
import { type ApiClient, ApiClientError } from './api';

type ApiEnvelope<T> = { data: T };

export type LivePage = {
  nextCursor: string | null;
  hasMore: boolean;
};

export type LiveCollection<T> = {
  data: T[];
  page: LivePage;
};

export type LiveUserProfile = {
  userId: string;
  displayName: string | null;
  timezone: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  intensityPreference: 'low' | 'standard' | 'high';
  onboardingCompletedAt: string | null;
};

export type LiveUserProfilePatch = Partial<
  Pick<LiveUserProfile, 'displayName' | 'timezone' | 'experienceLevel' | 'intensityPreference'>
>;

export type LiveSettings = {
  accessibilityPreferences: {
    reducedMotion?: boolean;
    highContrast?: boolean;
    largerText?: boolean;
    screenReader?: boolean;
  };
  feedbackPreferences: {
    spokenFeedback?: boolean;
    visualFeedback?: boolean;
    hapticFeedback?: boolean;
    detailLevel?: 'brief' | 'standard' | 'detailed';
  };
  poseOverlayEnabled: boolean;
  defaultRestDurationSeconds: number;
};

export type LiveSettingsPatch = Partial<LiveSettings>;

export type LiveBodyRegionState = 'neutral' | 'focus' | 'limited' | 'avoid';
export type LiveCapabilityState = 'unknown' | 'available' | 'limited' | 'avoid';
export type LiveIntensityPreference = 'low' | 'standard' | 'high';

export type LiveMovementProfile = {
  version: number;
  bodyRegions: Record<string, LiveBodyRegionState>;
  capabilities: Record<string, LiveCapabilityState>;
  equipmentIds: string[];
  goalIds: string[];
  intensityPreference: LiveIntensityPreference;
};

export type LiveMovementProfileUpdate = Omit<LiveMovementProfile, 'version'> & {
  expectedVersion: number;
};

export type LiveProfileReferenceMap = {
  bodyRegions: Record<string, readonly string[]>;
  equipment: Record<string, string | null>;
  goals: Record<string, string>;
};

export const defaultLiveProfileReferenceMap: LiveProfileReferenceMap = {
  bodyRegions: {
    Shoulders: ['shoulders', 'left_shoulder', 'right_shoulder'],
    Arms: [
      'upper_arms',
      'elbows',
      'forearms_hands',
      'left_upper_arm',
      'right_upper_arm',
      'left_elbow',
      'right_elbow',
      'left_forearm_hand',
      'right_forearm_hand',
    ],
    Core: ['torso'],
    Back: ['upper_back'],
    'Lower Back': ['lower_back'],
    Hips: ['hips', 'left_hip', 'right_hip'],
    'Left Knee': ['knees', 'left_knee'],
    'Right Knee': ['knees', 'right_knee'],
    'Lower Body': [
      'lower_body',
      'thighs',
      'lower_legs',
      'ankles_feet',
      'left_thigh',
      'right_thigh',
      'left_lower_leg',
      'right_lower_leg',
      'left_ankle_foot',
      'right_ankle_foot',
    ],
  },
  equipment: {
    Bodyweight: null,
    Dumbbells: 'dumbbells',
    'Resistance Band': 'resistance_band',
    'Stable Chair': 'stable-chair',
    Wall: 'wall',
    'Ankle Weight': 'ankle-weight',
    'Exercise Mat': 'exercise-mat',
    'Water Bottles': 'water-bottles',
  },
  goals: {
    strength: 'strength',
    mobility: 'mobility',
    balance: 'balance',
    cardio: 'cardio',
    core: 'core',
    'upper body': 'upper_body',
    'lower body': 'lower_body',
  },
};

export type LiveReferenceEntry = {
  id: string;
  label: string;
  sortOrder: number;
};

export type LiveReferenceData = {
  bodyRegions: Array<
    LiveReferenceEntry & {
      side: 'central' | 'left' | 'right';
      parentId?: string;
    }
  >;
  capabilities: LiveReferenceEntry[];
  equipment: Array<LiveReferenceEntry & { category: string }>;
  goals: LiveReferenceEntry[];
  muscleGroups: LiveReferenceEntry[];
};

export type LiveExercisePrescription = {
  sets: number;
  reps?: number;
  holdSeconds?: number;
  restSeconds: number;
};

export type LiveExerciseSummary = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  category: 'strength' | 'mobility' | 'balance' | 'cardio';
  position: 'seated' | 'standing' | 'floor' | 'kneeling';
  difficulty: number;
  defaultPrescription: LiveExercisePrescription;
  trackingSupported: boolean;
  contentVersion: number;
};

export type LiveCompatibilityReason = {
  code:
    | 'avoided_body_region'
    | 'limited_body_region'
    | 'unknown_required_capability'
    | 'avoided_required_capability'
    | 'limited_required_capability'
    | 'missing_required_equipment'
    | 'inactive_exercise'
    | 'intensity_exceeded'
    | 'tracking_not_supported';
  severity: 'info' | 'warning' | 'conflict';
  relatedId?: string;
  message: string;
};

export type LiveCompatibilityResult = {
  exerciseId: string;
  exerciseSlug: string;
  status: CompatibilityStatus;
  score: number;
  engineVersion: string;
  reasons: LiveCompatibilityReason[];
};

export type LiveWorkoutItem = {
  id: string;
  position: number;
  exerciseId: string;
  exerciseSlug: string;
  sets: number;
  reps?: number;
  holdSeconds?: number;
  restSeconds: number;
  compatibility: LiveCompatibilityResult;
};

export type LiveWorkout = {
  id: string;
  source: 'generated' | 'manual';
  title: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  requestedDurationMinutes: number | null;
  engineVersion: string | null;
  profileVersion: number | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  items: LiveWorkoutItem[];
};

export type LiveGenerateWorkoutInput = {
  durationMinutes: number;
  primaryRegionIds?: string[];
  secondaryRegionIds?: string[];
  goalIds?: string[];
  equipmentIds?: string[];
  intensityPreference?: LiveIntensityPreference;
  clientRequestId?: string;
};

export type LiveGeneratedWorkoutItem = LiveWorkoutItem & {
  estimatedSeconds: number;
  rankScore: number;
};

export type LiveGeneratedWorkout = {
  workoutId: string;
  source: 'generated';
  status: 'draft' | 'active';
  version: number;
  createdAt: string;
  updatedAt: string;
  engineVersion: string;
  requestedDurationMinutes: number;
  totalEstimatedSeconds: number;
  items: LiveGeneratedWorkoutItem[];
};

type LiveManualWorkoutItemBase = {
  exerciseId: string;
  sets: number;
  restSeconds: number;
  cautionAcknowledgements?: string[];
};

export type LiveManualWorkoutItem = LiveManualWorkoutItemBase &
  ({ reps: number; holdSeconds?: never } | { reps?: never; holdSeconds: number });

export type LiveManualWorkoutInput = {
  title: string;
  items: LiveManualWorkoutItem[];
  clientRequestId?: string;
};

export type LiveWorkoutPatch = {
  expectedVersion: number;
  title?: string;
  status?: 'draft' | 'active';
};

export type LiveWorkoutItemPatch = {
  expectedWorkoutVersion: number;
  exerciseId?: string;
  sets?: number;
  reps?: number | null;
  holdSeconds?: number | null;
  restSeconds?: number;
  cautionAcknowledgements?: string[];
};

export type LiveExerciseAlternative = {
  exercise: LiveExerciseSummary;
  compatibility: LiveCompatibilityResult;
  rankScore: number;
};

export type LiveWorkoutSessionState = 'active' | 'paused' | 'resting' | 'completed' | 'cancelled';

export type LiveWorkoutSession = {
  id: string;
  workoutId: string;
  state: LiveWorkoutSessionState;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  version: number;
};

export type LiveExerciseSessionState =
  | 'pending'
  | 'active'
  | 'paused'
  | 'resting'
  | 'completed'
  | 'cancelled'
  | 'skipped';

export type LiveExerciseSession = {
  id: string;
  workoutSessionId: string;
  workoutItemId: string | null;
  exerciseId: string;
  state: LiveExerciseSessionState;
  targetReps: number;
  targetSets: number;
  completedReps: number;
  completedSets: number;
  startedAt: string | null;
  endedAt: string | null;
  version: number;
};

export type LiveFeedbackCode =
  | 'low_tracking_confidence'
  | 'tempo_too_slow'
  | 'range_of_motion_short'
  | 'target_position_missed'
  | 'movement_jerky'
  | 'stability_left'
  | 'stability_right';

export type LiveRepMetric = {
  setNumber: number;
  repNumber: number;
  counted: boolean;
  durationMs?: number;
  rangeOfMotionDeg?: number;
  targetPositionReached?: boolean;
  accuracyScore?: number;
  controlScore?: number;
  stabilityScore?: number;
  formScore?: number;
  trackingConfidence?: number;
  feedbackCodes: LiveFeedbackCode[];
  recordedOffsetMs?: number;
};

export type LiveMetricBatchResult = {
  acceptedCount: number;
  duplicateCount: number;
  rejectedCount: number;
};

export type LiveExerciseAnalysis = {
  completion: {
    countedReps: number;
    targetReps: number;
    percentage: number;
  };
  rangeOfMotion: {
    averageDeg: number | null;
    minimumDeg: number | null;
    maximumDeg: number | null;
    percentageInTarget: number | null;
  };
  movementAccuracy: number | null;
  movementControl: number | null;
  stability: number | null;
  tempo: {
    meanSeconds: number | null;
    medianSeconds: number | null;
    standardDeviationSeconds: number | null;
    targetAdherence: number | null;
  };
  overallScore: number | null;
  performanceChange: {
    classification: 'stable' | 'mild_decline' | 'notable_decline';
    delta: number;
  } | null;
};

export type LiveProgressSummary = {
  totalActiveSeconds: number;
  totalExercises: number;
  totalSets: number;
  totalReps: number;
  averageScore: number | null;
  bodyCoverage: Array<{ bodyRegionId: string; intensity: number }>;
};

export type LiveProgressActivity = {
  activityDate: string;
  sessionCount: number;
  exerciseCount: number;
  setCount: number;
  repCount: number;
  activeSeconds: number;
  averageScore: number | null;
};

export type LiveExerciseProgress = {
  exerciseId: string;
  currentScore: number | null;
  baselineScore: number | null;
  scoreDelta: number | null;
  relativePercentage: number | null;
};

export type LiveExerciseFilters = {
  search?: string;
  bodyRegion?: string;
  category?: LiveExerciseSummary['category'];
  position?: LiveExerciseSummary['position'];
  equipment?: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  trackingSupported?: boolean;
  sort?: 'slug' | 'name' | 'difficulty';
  limit?: number;
  cursor?: string;
};

export type LiveActivityFilters = {
  startDate?: string;
  endDate?: string;
  limit?: number;
  cursor?: string;
};

export type LiveAnalysisView = {
  completedReps: number;
  targetReps: number;
  completionPercentage: number;
  rangeOfMotionPercentage: number | null;
  averageRangeOfMotionDegrees: number | null;
  accuracyScore: number | null;
  controlScore: number | null;
  stabilityScore: number | null;
  meanTempoSeconds: number | null;
  overallScore: number | null;
  performanceChange: LiveExerciseAnalysis['performanceChange'];
};

export type LiveProgressDashboard = {
  summary: UiProgressSummary;
  rawSummary: LiveProgressSummary;
  weeklyActivity: LiveProgressActivity[];
  bodyCoveragePeriod: 'all-time';
};

export type LiveExercisePresentation = Pick<
  UiExercise,
  'bodyRegions' | 'muscles' | 'equipment' | 'instructions' | 'tips'
> &
  Partial<
    Pick<UiExercise, 'cautionReasons' | 'adaptationSlug' | 'image' | 'compatibility' | 'position'>
  >;

export type HydratedLiveHistoryItem = {
  session: LiveWorkoutSession;
  workout: LiveWorkout;
  exerciseSessions: LiveExerciseSession[];
  exercises: LiveExerciseSummary[];
  analyses: Array<{
    exerciseSessionId: string;
    analysis: LiveExerciseAnalysis | null;
  }>;
};

export type LiveHistoryPage = {
  data: HydratedLiveHistoryItem[];
  page: LivePage;
};

export const livePresentationSlugAliases: Readonly<Record<string, string>> = {
  'seated-biceps-curl': 'seated-bicep-curl',
  'seated-resistance-band-row': 'resistance-band-row',
  'seated-march': 'chair-march',
  'supine-bridge': 'glute-bridge',
};

export const presentationSlugForLiveExercise = (slug: string): string =>
  livePresentationSlugAliases[slug] ?? slug;

export class LiveAdapterMappingError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'LiveAdapterMappingError';
    this.code = code;
  }
}

export class UnsupportedLiveFeatureError extends Error {
  readonly feature: string;

  constructor(feature: string, message: string) {
    super(message);
    this.name = 'UnsupportedLiveFeatureError';
    this.feature = feature;
  }
}

export class LiveMutationUncertainError extends Error {
  readonly operation: string;

  constructor(operation: string, message: string) {
    super(message);
    this.name = 'LiveMutationUncertainError';
    this.operation = operation;
  }
}

type LiveHttpClient = Pick<ApiClient, 'get' | 'post' | 'put' | 'patch' | 'request'>;

const pathSegment = (value: string): string => encodeURIComponent(value);

const pathWithQuery = (
  path: string,
  values: Record<string, string | number | boolean | undefined>,
): string => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized.length === 0 ? path : `${path}?${serialized}`;
};

const defaultRequestId = (): string => {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new UnsupportedLiveFeatureError(
      'idempotent_create',
      'This browser cannot generate the UUID required for an idempotent live create.',
    );
  }
  return crypto.randomUUID();
};

const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);

const startOfUtcWeek = (now: Date): Date => {
  const result = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const mondayOffset = (result.getUTCDay() + 6) % 7;
  result.setUTCDate(result.getUTCDate() - mondayOffset);
  return result;
};

const mean = (values: number[]): number | null => {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
};

export const mapLiveUserProfileToUi = (
  profile: LiveUserProfile,
  authenticatedEmail: string,
): UiUserProfile => ({
  displayName: profile.displayName?.trim() || 'AdaptFit member',
  email: authenticatedEmail,
});

export const mapLiveMovementProfileToUi = (
  profile: LiveMovementProfile,
  references: LiveProfileReferenceMap = defaultLiveProfileReferenceMap,
): UiMovementProfile => ({
  focusRegions: Object.entries(references.bodyRegions).flatMap(([uiRegion, regionIds]) => {
    const states = regionIds.map((regionId) => profile.bodyRegions[regionId]);
    return states.includes('focus') && !states.includes('avoid') ? [uiRegion] : [];
  }),
  avoidRegions: Object.entries(references.bodyRegions).flatMap(([uiRegion, regionIds]) =>
    regionIds.some((regionId) => profile.bodyRegions[regionId] === 'avoid') ? [uiRegion] : [],
  ),
  equipment: profile.equipmentIds.map(
    (equipmentId) =>
      Object.entries(references.equipment).find(([, id]) => id === equipmentId)?.[0] ?? equipmentId,
  ),
  goals: profile.goalIds.map(
    (goalId) => Object.entries(references.goals).find(([, id]) => id === goalId)?.[0] ?? goalId,
  ),
  version: profile.version,
});

export const mapUiMovementProfileToLiveUpdate = (
  profile: UiMovementProfile,
  current: LiveMovementProfile,
  references: LiveProfileReferenceMap = defaultLiveProfileReferenceMap,
): LiveMovementProfileUpdate => {
  const focus = new Set(
    profile.focusRegions.flatMap((uiRegion) => references.bodyRegions[uiRegion] ?? [uiRegion]),
  );
  const avoid = new Set(
    profile.avoidRegions.flatMap((uiRegion) => references.bodyRegions[uiRegion] ?? [uiRegion]),
  );
  const knownRegionIds = new Set(Object.values(references.bodyRegions).flat());
  const regionIds = new Set([...Object.keys(current.bodyRegions), ...focus, ...avoid]);
  const bodyRegions: Record<string, LiveBodyRegionState> = {};
  for (const regionId of regionIds) {
    if (avoid.has(regionId)) bodyRegions[regionId] = 'avoid';
    else if (focus.has(regionId)) bodyRegions[regionId] = 'focus';
    else if (!knownRegionIds.has(regionId) && current.bodyRegions[regionId] !== undefined) {
      bodyRegions[regionId] = current.bodyRegions[regionId];
    } else if (current.bodyRegions[regionId] === 'limited') bodyRegions[regionId] = 'limited';
    else bodyRegions[regionId] = 'neutral';
  }
  const knownEquipmentIds = new Set(
    Object.values(references.equipment).flatMap((equipmentId) =>
      equipmentId === null ? [] : [equipmentId],
    ),
  );
  const knownGoalIds = new Set(Object.values(references.goals));
  const selectedEquipmentIds = profile.equipment.flatMap((equipment) => {
    const equipmentId = references.equipment[equipment];
    if (equipmentId === null) return [];
    return [equipmentId ?? equipment];
  });
  const selectedGoalIds = profile.goals.map(
    (goal) => references.goals[goal] ?? references.goals[goal.toLocaleLowerCase()] ?? goal,
  );
  return {
    expectedVersion: current.version,
    bodyRegions,
    capabilities: { ...current.capabilities },
    equipmentIds: [
      ...new Set([
        ...selectedEquipmentIds,
        ...current.equipmentIds.filter((equipmentId) => !knownEquipmentIds.has(equipmentId)),
      ]),
    ],
    goalIds: [
      ...new Set([
        ...selectedGoalIds,
        ...current.goalIds.filter((goalId) => !knownGoalIds.has(goalId)),
      ]),
    ],
    intensityPreference: current.intensityPreference,
  };
};

export const mapLiveExerciseToUi = (
  exercise: LiveExerciseSummary,
  presentation: LiveExercisePresentation | undefined,
  compatibility?: LiveCompatibilityResult,
): UiExercise => {
  if (presentation === undefined) {
    throw new LiveAdapterMappingError(
      'exercise_presentation_missing',
      `The live exercise summary for "${exercise.slug}" does not include instructions, safety cues, muscles, equipment detail, or imagery. Supply reviewed local presentation content before rendering the detail screen.`,
    );
  }
  const reps = exercise.defaultPrescription.reps;
  if (reps === undefined) {
    throw new LiveAdapterMappingError(
      'hold_prescription_not_supported',
      `The current web exercise model cannot represent the hold-based prescription for "${exercise.slug}".`,
    );
  }
  const position = presentation.position ?? exercise.position;
  if (position === 'kneeling') {
    throw new LiveAdapterMappingError(
      'kneeling_position_not_supported',
      `The current web exercise model cannot represent the kneeling position for "${exercise.slug}".`,
    );
  }
  const status = compatibility?.status ?? presentation.compatibility;
  if (status === undefined) {
    throw new LiveAdapterMappingError(
      'compatibility_missing',
      `Personalized compatibility has not been loaded for "${exercise.slug}".`,
    );
  }
  const warningMessages = compatibility?.reasons
    .filter((reason) => reason.severity === 'warning' || reason.severity === 'conflict')
    .map((reason) => reason.message);
  return {
    id: exercise.id,
    slug: exercise.slug,
    name: exercise.name,
    summary: exercise.summary,
    category: exercise.category,
    position,
    difficulty: exercise.difficulty as UiExercise['difficulty'],
    defaultReps: reps,
    defaultSets: exercise.defaultPrescription.sets,
    restSeconds: exercise.defaultPrescription.restSeconds,
    trackingSupported: exercise.trackingSupported,
    bodyRegions: [...presentation.bodyRegions],
    muscles: [...presentation.muscles],
    equipment: [...presentation.equipment],
    instructions: [...presentation.instructions],
    tips: [...presentation.tips],
    compatibility: status,
    ...((warningMessages?.length ?? 0) > 0
      ? { cautionReasons: warningMessages }
      : presentation.cautionReasons === undefined
        ? {}
        : { cautionReasons: [...presentation.cautionReasons] }),
    ...(presentation.adaptationSlug === undefined
      ? {}
      : { adaptationSlug: presentation.adaptationSlug }),
    ...(presentation.image === undefined ? {} : { image: presentation.image }),
  };
};

export const mapLiveProgressToUi = (
  summary: LiveProgressSummary,
  weeklyActivity: LiveProgressActivity[],
  totalBodyRegionCount: number,
): UiProgressSummary => {
  const coveredRegionCount = new Set(
    summary.bodyCoverage.filter((entry) => entry.intensity > 0).map((entry) => entry.bodyRegionId),
  ).size;
  const bodyCoverage =
    totalBodyRegionCount <= 0
      ? 0
      : Math.round(Math.min(1, coveredRegionCount / totalBodyRegionCount) * 100);
  return {
    totalSeconds: summary.totalActiveSeconds,
    exercisesCompleted: summary.totalExercises,
    totalReps: summary.totalReps,
    totalSets: summary.totalSets,
    bodyCoverage,
    averageFormScore: Math.round(summary.averageScore ?? 0),
    weeklyWorkouts: weeklyActivity.reduce((total, row) => total + row.sessionCount, 0),
    weeklySeconds: weeklyActivity.reduce((total, row) => total + row.activeSeconds, 0),
    weeklyReps: weeklyActivity.reduce((total, row) => total + row.repCount, 0),
    weeklySets: weeklyActivity.reduce((total, row) => total + row.setCount, 0),
  };
};

export const mapLiveAnalysisToView = (analysis: LiveExerciseAnalysis): LiveAnalysisView => ({
  completedReps: analysis.completion.countedReps,
  targetReps: analysis.completion.targetReps,
  completionPercentage: analysis.completion.percentage,
  rangeOfMotionPercentage: analysis.rangeOfMotion.percentageInTarget,
  averageRangeOfMotionDegrees: analysis.rangeOfMotion.averageDeg,
  accuracyScore: analysis.movementAccuracy,
  controlScore: analysis.movementControl,
  stabilityScore: analysis.stability,
  meanTempoSeconds: analysis.tempo.meanSeconds,
  overallScore: analysis.overallScore,
  performanceChange: analysis.performanceChange,
});

export const toLiveRepMetricPayload = (metric: LiveRepMetric): LiveRepMetric => ({
  setNumber: metric.setNumber,
  repNumber: metric.repNumber,
  counted: metric.counted,
  feedbackCodes: [...metric.feedbackCodes],
  ...(metric.durationMs === undefined ? {} : { durationMs: metric.durationMs }),
  ...(metric.rangeOfMotionDeg === undefined ? {} : { rangeOfMotionDeg: metric.rangeOfMotionDeg }),
  ...(metric.targetPositionReached === undefined
    ? {}
    : { targetPositionReached: metric.targetPositionReached }),
  ...(metric.accuracyScore === undefined ? {} : { accuracyScore: metric.accuracyScore }),
  ...(metric.controlScore === undefined ? {} : { controlScore: metric.controlScore }),
  ...(metric.stabilityScore === undefined ? {} : { stabilityScore: metric.stabilityScore }),
  ...(metric.formScore === undefined ? {} : { formScore: metric.formScore }),
  ...(metric.trackingConfidence === undefined
    ? {}
    : { trackingConfidence: metric.trackingConfidence }),
  ...(metric.recordedOffsetMs === undefined ? {} : { recordedOffsetMs: metric.recordedOffsetMs }),
});

export const mapLiveHistoryItemToUi = (
  item: HydratedLiveHistoryItem,
  options: {
    category?: UiWorkoutHistoryItem['category'];
    favorite?: boolean;
    fallbackFormScore?: number;
  } = {},
): UiWorkoutHistoryItem => {
  const score = mean(
    item.analyses.flatMap(({ analysis }) =>
      analysis?.overallScore === null || analysis?.overallScore === undefined
        ? []
        : [analysis.overallScore],
    ),
  );
  if (score === null && options.fallbackFormScore === undefined) {
    throw new LiveAdapterMappingError(
      'history_score_missing',
      `The completed live workout session "${item.session.id}" has no scored exercise analysis. Supply an explicit fallback before mapping it into the current history tile.`,
    );
  }
  const primaryCategory = item.exercises[0]?.category;
  if (primaryCategory === undefined) {
    throw new LiveAdapterMappingError(
      'history_exercise_missing',
      `The live workout session "${item.session.id}" has no exercise summary to categorize.`,
    );
  }
  if (
    options.category === undefined &&
    primaryCategory !== 'strength' &&
    primaryCategory !== 'mobility'
  ) {
    throw new LiveAdapterMappingError(
      'history_category_unsupported',
      `The current history model cannot represent the live "${primaryCategory}" category. Supply an explicit reviewed category mapping.`,
    );
  }
  const category: UiWorkoutHistoryItem['category'] =
    options.category ?? (primaryCategory === 'mobility' ? 'mobility' : 'strength');
  return {
    id: item.session.id,
    title: item.workout.title,
    category,
    completedAt: item.session.endedAt ?? item.session.startedAt,
    completedReps: item.exerciseSessions.reduce(
      (total, exerciseSession) => total + exerciseSession.completedReps,
      0,
    ),
    targetReps: item.exerciseSessions.reduce(
      (total, exerciseSession) => total + exerciseSession.targetReps,
      0,
    ),
    durationSeconds: item.session.durationSeconds ?? 0,
    formScore: Math.round(score ?? options.fallbackFormScore ?? 0),
    ...(options.favorite === undefined ? {} : { favorite: options.favorite }),
  };
};

const isAnalysisNotReady = (error: unknown): boolean =>
  error instanceof ApiClientError && error.problem?.code === 'analysis_not_ready';

export class LiveAdapter {
  constructor(
    private readonly client: LiveHttpClient,
    private readonly createRequestId: () => string = defaultRequestId,
  ) {}

  async getRawUserProfile(): Promise<LiveUserProfile> {
    return (await this.client.get<ApiEnvelope<LiveUserProfile>>('/v1/users/me')).data;
  }

  async getUserProfile(authenticatedEmail: string): Promise<UiUserProfile> {
    return mapLiveUserProfileToUi(await this.getRawUserProfile(), authenticatedEmail);
  }

  async patchRawUserProfile(patch: LiveUserProfilePatch): Promise<LiveUserProfile> {
    return (await this.client.patch<ApiEnvelope<LiveUserProfile>>('/v1/users/me', patch)).data;
  }

  async saveUserProfile(
    profile: UiUserProfile,
    authenticatedEmail: string,
  ): Promise<UiUserProfile> {
    if (
      profile.email.trim().toLocaleLowerCase() !== authenticatedEmail.trim().toLocaleLowerCase()
    ) {
      throw new UnsupportedLiveFeatureError(
        'email_change',
        'The Fastify profile route cannot change a Supabase Auth email. Update email through an authenticated Supabase email-change flow.',
      );
    }
    const saved = await this.patchRawUserProfile({ displayName: profile.displayName });
    return mapLiveUserProfileToUi(saved, authenticatedEmail);
  }

  async deleteAccount(): Promise<void> {
    await this.client.request<void>('/v1/users/me', { method: 'DELETE' });
  }

  async getSettings(): Promise<LiveSettings> {
    return (await this.client.get<ApiEnvelope<LiveSettings>>('/v1/settings')).data;
  }

  async patchSettings(patch: LiveSettingsPatch): Promise<LiveSettings> {
    return (await this.client.patch<ApiEnvelope<LiveSettings>>('/v1/settings', patch)).data;
  }

  async getReferenceData(): Promise<LiveReferenceData> {
    return (await this.client.get<ApiEnvelope<LiveReferenceData>>('/v1/reference-data')).data;
  }

  async listExercises(
    filters: LiveExerciseFilters = {},
  ): Promise<LiveCollection<LiveExerciseSummary>> {
    return this.client.get<LiveCollection<LiveExerciseSummary>>(
      pathWithQuery('/v1/exercises', filters),
    );
  }

  async listAllExercises(
    filters: Omit<LiveExerciseFilters, 'cursor' | 'limit'> = {},
  ): Promise<LiveExerciseSummary[]> {
    const exercises: LiveExerciseSummary[] = [];
    let cursor: string | undefined;
    for (let pageNumber = 0; pageNumber < 100; pageNumber += 1) {
      const page = await this.listExercises({ ...filters, limit: 100, cursor });
      exercises.push(...page.data);
      if (!page.page.hasMore || page.page.nextCursor === null) return exercises;
      cursor = page.page.nextCursor;
    }
    throw new LiveAdapterMappingError(
      'catalog_pagination_limit',
      'The exercise catalog exceeded the adapter safety limit of 10,000 records.',
    );
  }

  async getExercise(exerciseIdOrSlug: string): Promise<LiveExerciseSummary> {
    return (
      await this.client.get<ApiEnvelope<LiveExerciseSummary>>(
        `/v1/exercises/${pathSegment(exerciseIdOrSlug)}`,
      )
    ).data;
  }

  async getCompatibility(
    exerciseIdOrSlug: string,
    trackingRequired?: boolean,
  ): Promise<LiveCompatibilityResult> {
    return (
      await this.client.get<ApiEnvelope<LiveCompatibilityResult>>(
        pathWithQuery(`/v1/exercises/${pathSegment(exerciseIdOrSlug)}/compatibility`, {
          trackingRequired,
        }),
      )
    ).data;
  }

  async getRawMovementProfile(): Promise<LiveMovementProfile> {
    return (await this.client.get<ApiEnvelope<LiveMovementProfile>>('/v1/movement-profile')).data;
  }

  async getMovementProfile(): Promise<UiMovementProfile> {
    return mapLiveMovementProfileToUi(await this.getRawMovementProfile());
  }

  async putRawMovementProfile(update: LiveMovementProfileUpdate): Promise<LiveMovementProfile> {
    return (await this.client.put<ApiEnvelope<LiveMovementProfile>>('/v1/movement-profile', update))
      .data;
  }

  async saveMovementProfile(
    profile: UiMovementProfile,
    current?: LiveMovementProfile,
  ): Promise<UiMovementProfile> {
    const snapshot = current ?? (await this.getRawMovementProfile());
    const saved = await this.putRawMovementProfile(
      mapUiMovementProfileToLiveUpdate(profile, snapshot),
    );
    return mapLiveMovementProfileToUi(saved);
  }

  async generateWorkout(input: LiveGenerateWorkoutInput): Promise<LiveGeneratedWorkout> {
    const { clientRequestId, ...request } = input;
    return (
      await this.client.post<ApiEnvelope<LiveGeneratedWorkout>>('/v1/workouts/generate', {
        ...request,
        clientRequestId: clientRequestId ?? this.createRequestId(),
      })
    ).data;
  }

  async createManualWorkout(input: LiveManualWorkoutInput): Promise<LiveWorkout> {
    const { clientRequestId, ...request } = input;
    return (
      await this.client.post<ApiEnvelope<LiveWorkout>>('/v1/workouts', {
        ...request,
        clientRequestId: clientRequestId ?? this.createRequestId(),
      })
    ).data;
  }

  async listWorkouts(limit = 20, cursor?: string): Promise<LiveCollection<LiveWorkout>> {
    return this.client.get<LiveCollection<LiveWorkout>>(
      pathWithQuery('/v1/workouts', { limit, cursor }),
    );
  }

  async getWorkout(workoutId: string): Promise<LiveWorkout> {
    return (
      await this.client.get<ApiEnvelope<LiveWorkout>>(`/v1/workouts/${pathSegment(workoutId)}`)
    ).data;
  }

  async patchWorkout(workoutId: string, patch: LiveWorkoutPatch): Promise<LiveWorkout> {
    return (
      await this.client.patch<ApiEnvelope<LiveWorkout>>(
        `/v1/workouts/${pathSegment(workoutId)}`,
        patch,
      )
    ).data;
  }

  async archiveWorkout(workoutId: string): Promise<LiveWorkout> {
    try {
      return (
        await this.client.request<ApiEnvelope<LiveWorkout>>(
          `/v1/workouts/${pathSegment(workoutId)}`,
          { method: 'DELETE' },
        )
      ).data;
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.status === 503 &&
        error.problem?.code === 'dependency_unavailable'
      ) {
        throw new LiveMutationUncertainError(
          'archive_workout',
          'The hosted repository can return an error after it has archived the workout. Refresh the workout list to verify that it disappeared before offering a retry.',
        );
      }
      throw error;
    }
  }

  async listWorkoutItemAlternatives(
    workoutId: string,
    itemId: string,
  ): Promise<LiveExerciseAlternative[]> {
    return (
      await this.client.get<ApiEnvelope<LiveExerciseAlternative[]>>(
        `/v1/workouts/${pathSegment(workoutId)}/items/${pathSegment(itemId)}/alternatives`,
      )
    ).data;
  }

  async patchWorkoutItem(
    workoutId: string,
    itemId: string,
    patch: LiveWorkoutItemPatch,
  ): Promise<LiveWorkout> {
    return (
      await this.client.patch<ApiEnvelope<LiveWorkout>>(
        `/v1/workouts/${pathSegment(workoutId)}/items/${pathSegment(itemId)}`,
        patch,
      )
    ).data;
  }

  async createWorkoutSession(
    workoutId: string,
    clientRequestId = this.createRequestId(),
  ): Promise<LiveWorkoutSession> {
    return (
      await this.client.post<ApiEnvelope<LiveWorkoutSession>>('/v1/workout-sessions', {
        workoutId,
        clientRequestId,
      })
    ).data;
  }

  async listWorkoutSessions(
    limit = 20,
    cursor?: string,
  ): Promise<LiveCollection<LiveWorkoutSession>> {
    return this.client.get<LiveCollection<LiveWorkoutSession>>(
      pathWithQuery('/v1/workout-sessions', { limit, cursor }),
    );
  }

  async getWorkoutSession(sessionId: string): Promise<LiveWorkoutSession> {
    return (
      await this.client.get<ApiEnvelope<LiveWorkoutSession>>(
        `/v1/workout-sessions/${pathSegment(sessionId)}`,
      )
    ).data;
  }

  async setWorkoutSessionState(
    sessionId: string,
    expectedVersion: number,
    state: Exclude<LiveWorkoutSessionState, 'completed'>,
    endReason?: string,
  ): Promise<LiveWorkoutSession> {
    return (
      await this.client.patch<ApiEnvelope<LiveWorkoutSession>>(
        `/v1/workout-sessions/${pathSegment(sessionId)}`,
        { expectedVersion, state, ...(endReason === undefined ? {} : { endReason }) },
      )
    ).data;
  }

  async completeWorkoutSession(
    sessionId: string,
    expectedVersion: number,
    endReason?: string,
  ): Promise<LiveWorkoutSession> {
    return (
      await this.client.post<ApiEnvelope<LiveWorkoutSession>>(
        `/v1/workout-sessions/${pathSegment(sessionId)}/complete`,
        { expectedVersion, ...(endReason === undefined ? {} : { endReason }) },
      )
    ).data;
  }

  async deleteWorkoutSession(sessionId: string): Promise<void> {
    await this.client.request<void>(`/v1/workout-sessions/${pathSegment(sessionId)}`, {
      method: 'DELETE',
    });
  }

  async listExerciseSessions(workoutSessionId: string): Promise<LiveExerciseSession[]> {
    return (
      await this.client.get<ApiEnvelope<LiveExerciseSession[]>>(
        `/v1/workout-sessions/${pathSegment(workoutSessionId)}/exercise-sessions`,
      )
    ).data;
  }

  async getExerciseSession(exerciseSessionId: string): Promise<LiveExerciseSession> {
    return (
      await this.client.get<ApiEnvelope<LiveExerciseSession>>(
        `/v1/exercise-sessions/${pathSegment(exerciseSessionId)}`,
      )
    ).data;
  }

  async setExerciseSessionState(
    exerciseSessionId: string,
    expectedVersion: number,
    state: Exclude<LiveExerciseSessionState, 'completed'>,
  ): Promise<LiveExerciseSession> {
    return (
      await this.client.patch<ApiEnvelope<LiveExerciseSession>>(
        `/v1/exercise-sessions/${pathSegment(exerciseSessionId)}`,
        { expectedVersion, state },
      )
    ).data;
  }

  async uploadDerivedMetrics(
    exerciseSessionId: string,
    metrics: LiveRepMetric[],
    batchId = this.createRequestId(),
  ): Promise<LiveMetricBatchResult> {
    return (
      await this.client.post<ApiEnvelope<LiveMetricBatchResult>>(
        `/v1/exercise-sessions/${pathSegment(exerciseSessionId)}/metrics`,
        { batchId, metrics: metrics.map(toLiveRepMetricPayload) },
      )
    ).data;
  }

  async completeExerciseSession(
    exerciseSessionId: string,
    expectedVersion: number,
  ): Promise<LiveExerciseAnalysis> {
    return (
      await this.client.post<ApiEnvelope<LiveExerciseAnalysis>>(
        `/v1/exercise-sessions/${pathSegment(exerciseSessionId)}/complete`,
        { expectedVersion },
      )
    ).data;
  }

  async getExerciseAnalysis(exerciseSessionId: string): Promise<LiveExerciseAnalysis> {
    return (
      await this.client.get<ApiEnvelope<LiveExerciseAnalysis>>(
        `/v1/exercise-sessions/${pathSegment(exerciseSessionId)}/analysis`,
      )
    ).data;
  }

  async getRawProgressSummary(): Promise<LiveProgressSummary> {
    return (await this.client.get<ApiEnvelope<LiveProgressSummary>>('/v1/progress/summary')).data;
  }

  async listProgressActivity(
    filters: LiveActivityFilters = {},
  ): Promise<LiveCollection<LiveProgressActivity>> {
    return this.client.get<LiveCollection<LiveProgressActivity>>(
      pathWithQuery('/v1/progress/activity', filters),
    );
  }

  async getExerciseProgress(exerciseId: string): Promise<LiveExerciseProgress> {
    return (
      await this.client.get<ApiEnvelope<LiveExerciseProgress>>(
        `/v1/progress/exercises/${pathSegment(exerciseId)}`,
      )
    ).data;
  }

  async getProgressDashboard(now = new Date()): Promise<LiveProgressDashboard> {
    const weekStart = startOfUtcWeek(now);
    const [summary, references, activity] = await Promise.all([
      this.getRawProgressSummary(),
      this.getReferenceData(),
      this.listProgressActivity({
        startDate: dateOnly(weekStart),
        endDate: dateOnly(now),
        limit: 100,
      }),
    ]);
    const coveredIds = new Set(summary.bodyCoverage.map((entry) => entry.bodyRegionId));
    const eligibleRegionCount = references.bodyRegions.filter(
      (region) =>
        region.side === 'central' && (region.parentId !== undefined || coveredIds.has(region.id)),
    ).length;
    return {
      summary: mapLiveProgressToUi(summary, activity.data, eligibleRegionCount),
      rawSummary: summary,
      weeklyActivity: activity.data,
      bodyCoveragePeriod: 'all-time',
    };
  }

  async getProgressSummary(now = new Date()): Promise<UiProgressSummary> {
    return (await this.getProgressDashboard(now)).summary;
  }

  async listHydratedHistory(limit = 20, cursor?: string): Promise<LiveHistoryPage> {
    const page = await this.listWorkoutSessions(limit, cursor);
    const data = await Promise.all(
      page.data
        .filter((session) => session.state === 'completed')
        .map((session) => this.hydrateHistoryItem(session)),
    );
    return { data, page: page.page };
  }

  private async hydrateHistoryItem(session: LiveWorkoutSession): Promise<HydratedLiveHistoryItem> {
    const [workout, exerciseSessions] = await Promise.all([
      this.getWorkout(session.workoutId),
      this.listExerciseSessions(session.id),
    ]);
    const exercises = await Promise.all(
      exerciseSessions.map((exerciseSession) => this.getExercise(exerciseSession.exerciseId)),
    );
    const analyses = await Promise.all(
      exerciseSessions.map(async (exerciseSession) => {
        if (exerciseSession.state !== 'completed') {
          return { exerciseSessionId: exerciseSession.id, analysis: null };
        }
        try {
          const analysis = await this.getExerciseAnalysis(exerciseSession.id);
          return { exerciseSessionId: exerciseSession.id, analysis };
        } catch (error) {
          if (isAnalysisNotReady(error)) {
            return { exerciseSessionId: exerciseSession.id, analysis: null };
          }
          throw error;
        }
      }),
    );
    return { session, workout, exerciseSessions, exercises, analyses };
  }
}
