import { type Static, Type } from '@sinclair/typebox';

// public api contracts for adaptfit. typebox is the source of truth for request/response shapes.
// extra properties are always off on these schemas. do not loosen that.
// never accept raw media, pose landmarks, or free-text journals through this package.

const UuidSchema = Type.String({
  pattern:
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$', // uuid v1-5, not nil
});
const NonEmptyStringSchema = Type.String({ minLength: 1 }); // empty string is never a valid id or label

// liveness vs readiness. /health means the process is up; /ready can still be degraded.
export const HealthResponseSchema = Type.Object({
  data: Type.Object({
    service: Type.Literal('api'),
    status: Type.Literal('ok'),
  }),
});

export type HealthResponse = Static<typeof HealthResponseSchema>;

export const ReadyResponseSchema = Type.Object({
  data: Type.Object({
    service: Type.Literal('api'),
    status: Type.Union([Type.Literal('ready'), Type.Literal('degraded')]), // degraded is still 200. not a hard outage.
  }),
});

export type ReadyResponse = Static<typeof ReadyResponseSchema>;

// problem-details-ish envelope. status stays 4xx/5xx so an error never looks healthy.
export const ErrorItemSchema = Type.Object({
  code: NonEmptyStringSchema,
  message: NonEmptyStringSchema,
  path: Type.Optional(Type.Array(NonEmptyStringSchema)), // field path when validation failed; omit for request-wide errors
});

export const ErrorResponseSchema = Type.Object({
  type: NonEmptyStringSchema,
  title: NonEmptyStringSchema,
  status: Type.Integer({ minimum: 400, maximum: 599 }),
  code: NonEmptyStringSchema,
  detail: NonEmptyStringSchema,
  requestId: NonEmptyStringSchema, // echo the incoming id so clients can match logs
  errors: Type.Optional(Type.Array(ErrorItemSchema, { maxItems: 50 })), // cap so a bad payload cannot dump an unbounded list
});

export type ErrorResponse = Static<typeof ErrorResponseSchema>;

// closed enums only. clients must not invent region or capability states.
export const BodyRegionStateSchema = Type.Union([
  Type.Literal('neutral'),
  Type.Literal('focus'),
  Type.Literal('limited'),
  Type.Literal('avoid'), // avoid is a hard no. limited is caution, not skip-by-default.
]);

export const CapabilityStateSchema = Type.Union([
  Type.Literal('unknown'), // we have not asked yet. do not treat unknown as available.
  Type.Literal('available'),
  Type.Literal('limited'),
  Type.Literal('avoid'),
]);

export const IntensityPreferenceSchema = Type.Union([
  Type.Literal('low'),
  Type.Literal('standard'),
  Type.Literal('high'),
]);

export const MovementProfileSchema = Type.Object({
  version: Type.Integer({ minimum: 1 }),
  bodyRegions: Type.Record(NonEmptyStringSchema, BodyRegionStateSchema), // keys are reference ids, not free labels
  capabilities: Type.Record(NonEmptyStringSchema, CapabilityStateSchema),
  equipmentIds: Type.Array(NonEmptyStringSchema, { maxItems: 64, uniqueItems: true }),
  goalIds: Type.Array(NonEmptyStringSchema, { maxItems: 32, uniqueItems: true }),
  intensityPreference: IntensityPreferenceSchema,
}); // no diagnoses, no free-text notes. keep it closed.

export type MovementProfile = Static<typeof MovementProfileSchema>;

export const UpdateMovementProfileRequestSchema = Type.Object({
  expectedVersion: Type.Integer({ minimum: 1 }), // optimistic lock. mismatch should 409, not overwrite.
  bodyRegions: Type.Record(NonEmptyStringSchema, BodyRegionStateSchema), // full replace of maps/arrays. this is not a sparse merge.
  capabilities: Type.Record(NonEmptyStringSchema, CapabilityStateSchema),
  equipmentIds: Type.Array(NonEmptyStringSchema, { maxItems: 64, uniqueItems: true }),
  goalIds: Type.Array(NonEmptyStringSchema, { maxItems: 32, uniqueItems: true }),
  intensityPreference: IntensityPreferenceSchema,
});

export type UpdateMovementProfileRequest = Static<typeof UpdateMovementProfileRequestSchema>;

// account surface. displayname uses null for "not set"; never send "".
export const ExperienceLevelSchema = Type.Union([
  Type.Literal('beginner'),
  Type.Literal('intermediate'),
  Type.Literal('advanced'),
]);

export const UserProfileSchema = Type.Object({
  userId: UuidSchema,
  displayName: Type.Union([Type.String({ maxLength: 120 }), Type.Null()]), // empty string is not allowed; use null
  timezone: NonEmptyStringSchema,
  experienceLevel: ExperienceLevelSchema,
  intensityPreference: IntensityPreferenceSchema,
  onboardingCompletedAt: Type.Union([Type.String({ minLength: 1 }), Type.Null()]), // server-owned. not on the patch schema below.
});

export const UserProfileResponseSchema = Type.Object({ data: UserProfileSchema });
export type UserProfile = Static<typeof UserProfileSchema>;

export const UserProfilePatchSchema = Type.Object({
  displayName: Type.Optional(Type.Union([Type.String({ maxLength: 120 }), Type.Null()])), // omitted stays as-is; null still clears
  timezone: Type.Optional(NonEmptyStringSchema),
  experienceLevel: Type.Optional(ExperienceLevelSchema),
  intensityPreference: Type.Optional(IntensityPreferenceSchema),
});
export type UserProfilePatch = Static<typeof UserProfilePatchSchema>;

// preference flags, not medical data. pose overlay is local ui and still must not upload frames.
export const AccessibilityPreferencesSchema = Type.Object({
  reducedMotion: Type.Optional(Type.Boolean()),
  highContrast: Type.Optional(Type.Boolean()),
  largerText: Type.Optional(Type.Boolean()),
  screenReader: Type.Optional(Type.Boolean()),
});

export const FeedbackPreferencesSchema = Type.Object({
  spokenFeedback: Type.Optional(Type.Boolean()),
  visualFeedback: Type.Optional(Type.Boolean()),
  hapticFeedback: Type.Optional(Type.Boolean()),
  detailLevel: Type.Optional(
    Type.Union([Type.Literal('brief'), Type.Literal('standard'), Type.Literal('detailed')]),
  ),
});

export const SettingsSchema = Type.Object({
  accessibilityPreferences: AccessibilityPreferencesSchema,
  feedbackPreferences: FeedbackPreferencesSchema,
  poseOverlayEnabled: Type.Boolean(), // local preview only. never a reason to send media upstream.
  defaultRestDurationSeconds: Type.Integer({ minimum: 0, maximum: 300 }), // 300s cap matches exercise restseconds
});

export const SettingsResponseSchema = Type.Object({ data: SettingsSchema });
export type Settings = Static<typeof SettingsSchema>;

export const SettingsPatchSchema = Type.Partial(SettingsSchema); // nested objects are replaced as a whole unless the route merges
export type SettingsPatch = Static<typeof SettingsPatchSchema>;

// compatibility-v1 wire format. reason codes must stay in lockstep with domain.
export const CompatibilityStatusSchema = Type.Union([
  Type.Literal('compatible'),
  Type.Literal('caution'),
  Type.Literal('incompatible'),
]);

export const CompatibilityReasonCodeSchema = Type.Union([
  // keep this list in lockstep with domain reason codes
  Type.Literal('avoided_body_region'),
  Type.Literal('limited_body_region'),
  Type.Literal('unknown_required_capability'),
  Type.Literal('avoided_required_capability'),
  Type.Literal('limited_required_capability'),
  Type.Literal('missing_required_equipment'),
  Type.Literal('inactive_exercise'),
  Type.Literal('intensity_exceeded'),
  Type.Literal('tracking_not_supported'),
]);

export const CompatibilityReasonSchema = Type.Object({
  code: CompatibilityReasonCodeSchema,
  severity: Type.Union([Type.Literal('info'), Type.Literal('warning'), Type.Literal('conflict')]),
  relatedId: Type.Optional(NonEmptyStringSchema),
  message: NonEmptyStringSchema, // canned copy from the engine. not a place for user notes.
});

export const CompatibilityResultSchema = Type.Object({
  exerciseId: UuidSchema,
  exerciseSlug: NonEmptyStringSchema,
  status: CompatibilityStatusSchema,
  score: Type.Integer({ minimum: 0, maximum: 100 }), // engine rank, not a medical score
  engineVersion: NonEmptyStringSchema, // pin results to the engine that produced them
  reasons: Type.Array(CompatibilityReasonSchema, { maxItems: 50 }),
});

export type CompatibilityResult = Static<typeof CompatibilityResultSchema>;

// catalog payloads. demands below are display-only; scoring still lives in domain.
export const ExercisePrescriptionSchema = Type.Object({
  sets: Type.Integer({ minimum: 1, maximum: 5 }),
  reps: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })), // strength uses reps; mobility often uses holdseconds instead
  holdSeconds: Type.Optional(Type.Integer({ minimum: 1, maximum: 600 })),
  restSeconds: Type.Integer({ minimum: 0, maximum: 300 }),
});

export const ExerciseSummarySchema = Type.Object({
  id: UuidSchema,
  slug: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  summary: NonEmptyStringSchema,
  category: Type.Union([
    Type.Literal('strength'),
    Type.Literal('mobility'),
    Type.Literal('balance'),
    Type.Literal('cardio'),
  ]),
  position: Type.Union([
    Type.Literal('seated'),
    Type.Literal('standing'),
    Type.Literal('floor'),
    Type.Literal('kneeling'),
  ]),
  difficulty: Type.Integer({ minimum: 1, maximum: 5 }),
  defaultPrescription: ExercisePrescriptionSchema,
  trackingSupported: Type.Boolean(), // false means manual logging only. do not start pose.
  contentVersion: Type.Integer({ minimum: 1 }), // bump when copy/demands change so clients can cache
});

export type ExerciseSummary = Static<typeof ExerciseSummarySchema>;

export const ExerciseDetailSchema = Type.Intersect([
  ExerciseSummarySchema,
  Type.Object({
    instructions: Type.Array(NonEmptyStringSchema, { minItems: 1, maxItems: 20 }),
    safetyCues: Type.Array(NonEmptyStringSchema, { minItems: 1, maxItems: 20 }),
    adaptations: Type.Array(NonEmptyStringSchema, { minItems: 1, maxItems: 20 }),
    // demands here are for display. scoring still lives in domain, not in this payload.
    bodyDemands: Type.Array(
      Type.Object({
        regionId: NonEmptyStringSchema,
        involvement: Type.Union([
          Type.Literal('primary'),
          Type.Literal('secondary'),
          Type.Literal('stabilizing'),
        ]),
        demand: Type.Union([
          Type.Literal('minimal'),
          Type.Literal('moderate'),
          Type.Literal('high'),
        ]),
      }),
      { minItems: 1, maxItems: 30 },
    ),
    capabilityDemands: Type.Array(
      Type.Object({
        capabilityId: NonEmptyStringSchema,
        demand: Type.Union([
          Type.Literal('minimal'),
          Type.Literal('moderate'),
          Type.Literal('high'),
        ]),
        required: Type.Boolean(),
      }),
      { maxItems: 30 },
    ),
    equipmentOptions: Type.Array(
      Type.Object({
        equipmentId: NonEmptyStringSchema,
        mode: Type.Union([Type.Literal('required'), Type.Literal('optional')]),
        orGroup: Type.Optional(NonEmptyStringSchema), // same group means any one piece satisfies the slot
      }),
      { maxItems: 30 },
    ),
    muscles: Type.Array(
      Type.Object({
        muscleGroupId: NonEmptyStringSchema,
        role: Type.Union([
          Type.Literal('primary'),
          Type.Literal('secondary'),
          Type.Literal('stabilizer'),
        ]),
        intensity: Type.Integer({ minimum: 1, maximum: 5 }),
      }),
      { minItems: 1, maxItems: 30 },
    ),
    sources: Type.Array(
      Type.Object({
        title: NonEmptyStringSchema,
        publisher: NonEmptyStringSchema,
        url: Type.String({ minLength: 1, maxLength: 2048 }),
        publicationYear: Type.Union([Type.Integer({ minimum: 1900, maximum: 2100 }), Type.Null()]),
      }),
      { minItems: 1, maxItems: 20 },
    ),
    trackingProfile: Type.Union([
      Type.Object({ key: NonEmptyStringSchema, version: Type.Integer({ minimum: 1 }) }),
      Type.Null(), // null means manual-only. do not invent a key on the client.
    ]),
  }),
]);

export type ExerciseDetail = Static<typeof ExerciseDetailSchema>;

// generation-v1. duration band must match the domain generator.
export const GeneratedWorkoutItemSchema = Type.Object({
  id: UuidSchema,
  position: Type.Integer({ minimum: 1, maximum: 6 }), // generated plans stay short on purpose
  exerciseId: UuidSchema,
  exerciseSlug: NonEmptyStringSchema,
  sets: Type.Integer({ minimum: 1, maximum: 5 }),
  reps: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
  holdSeconds: Type.Optional(Type.Integer({ minimum: 1, maximum: 600 })),
  restSeconds: Type.Integer({ minimum: 0, maximum: 300 }),
  estimatedSeconds: Type.Integer({ minimum: 1 }),
  rankScore: Type.Integer({ minimum: 0, maximum: 100 }), // for ordering, not a user-facing grade
  compatibility: CompatibilityResultSchema,
});

export const GenerateWorkoutRequestSchema = Type.Object({
  clientRequestId: UuidSchema, // idempotency key. reuse it on retry, do not mint a new one.
  durationMinutes: Type.Integer({ minimum: 5, maximum: 45 }), // same band as the domain generator
  primaryRegionIds: Type.Optional(
    Type.Array(NonEmptyStringSchema, { maxItems: 12, uniqueItems: true }),
  ), // these override the stored profile for this one generate
  secondaryRegionIds: Type.Optional(
    Type.Array(NonEmptyStringSchema, { maxItems: 12, uniqueItems: true }),
  ),
  goalIds: Type.Optional(Type.Array(NonEmptyStringSchema, { maxItems: 12, uniqueItems: true })),
  equipmentIds: Type.Optional(
    Type.Array(NonEmptyStringSchema, { maxItems: 64, uniqueItems: true }),
  ),
  intensityPreference: Type.Optional(IntensityPreferenceSchema),
});

export type GenerateWorkoutRequest = Static<typeof GenerateWorkoutRequestSchema>;

export const GenerateWorkoutResponseSchema = Type.Object({
  data: Type.Object({
    workoutId: UuidSchema,
    source: Type.Literal('generated'), // literal so clients cannot relabel a generated plan as manual
    status: Type.Union([Type.Literal('draft'), Type.Literal('active')]),
    version: Type.Integer({ minimum: 1 }),
    createdAt: Type.String({ minLength: 1 }),
    updatedAt: Type.String({ minLength: 1 }),
    engineVersion: NonEmptyStringSchema,
    requestedDurationMinutes: Type.Integer({ minimum: 5, maximum: 45 }),
    totalEstimatedSeconds: Type.Integer({ minimum: 1 }),
    items: Type.Array(GeneratedWorkoutItemSchema, { minItems: 3, maxItems: 6 }), // generation never returns a 1-item plan
  }),
});

export type GenerateWorkoutResponse = Static<typeof GenerateWorkoutResponseSchema>;

export const PageSchema = Type.Object({
  nextCursor: Type.Union([Type.String(), Type.Null()]), // opaque. do not parse it; pass it back as-is.
  hasMore: Type.Boolean(),
});

export const WorkoutStatusSchema = Type.Union([
  Type.Literal('draft'),
  Type.Literal('active'),
  Type.Literal('completed'),
  Type.Literal('archived'), // archived is not deleted. list filters should still hide it.
]);

export const WorkoutSourceSchema = Type.Union([Type.Literal('generated'), Type.Literal('manual')]);

export const WorkoutItemSchema = Type.Object({
  id: UuidSchema,
  position: Type.Integer({ minimum: 1, maximum: 50 }), // manual can go to 50; generated items stay in the 1-6 band
  exerciseId: UuidSchema,
  exerciseSlug: NonEmptyStringSchema,
  sets: Type.Integer({ minimum: 1, maximum: 5 }),
  reps: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
  holdSeconds: Type.Optional(Type.Integer({ minimum: 1, maximum: 600 })),
  restSeconds: Type.Integer({ minimum: 0, maximum: 300 }),
  compatibility: CompatibilityResultSchema,
});

export const WorkoutSchema = Type.Object({
  id: UuidSchema,
  source: WorkoutSourceSchema,
  title: NonEmptyStringSchema,
  status: WorkoutStatusSchema,
  requestedDurationMinutes: Type.Union([Type.Integer({ minimum: 5, maximum: 45 }), Type.Null()]), // null on manual plans that never asked the generator
  engineVersion: Type.Union([NonEmptyStringSchema, Type.Null()]),
  profileVersion: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]), // snapshot of the movement profile at create/generate time
  version: Type.Integer({ minimum: 1 }),
  createdAt: Type.String({ minLength: 1 }),
  updatedAt: Type.String({ minLength: 1 }),
  items: Type.Array(WorkoutItemSchema, { minItems: 1, maxItems: 50 }),
});

export const WorkoutResponseSchema = Type.Object({ data: WorkoutSchema });
export const WorkoutListResponseSchema = Type.Object({
  data: Type.Array(WorkoutSchema),
  page: PageSchema,
});

export const CreateManualWorkoutRequestSchema = Type.Object({
  clientRequestId: UuidSchema, // same idempotency rule as generate: reuse on retry
  title: Type.String({ minLength: 1, maxLength: 120 }),
  items: Type.Array(
    Type.Object({
      exerciseId: UuidSchema,
      sets: Type.Integer({ minimum: 1, maximum: 5 }),
      reps: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
      holdSeconds: Type.Optional(Type.Integer({ minimum: 1, maximum: 600 })),
      restSeconds: Type.Integer({ minimum: 0, maximum: 300 }),
      cautionAcknowledgements: Type.Optional(Type.Array(NonEmptyStringSchema, { maxItems: 50 })), // required when compatibility is caution
    }),
    { minItems: 1, maxItems: 50 },
  ),
});

export const PatchWorkoutRequestSchema = Type.Object({
  expectedVersion: Type.Integer({ minimum: 1 }),
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  status: Type.Optional(Type.Union([Type.Literal('draft'), Type.Literal('active')])), // cannot patch to archived here
});

export type Workout = Static<typeof WorkoutSchema>;
export type WorkoutItem = Static<typeof WorkoutItemSchema>;
export type CreateManualWorkoutRequest = Static<typeof CreateManualWorkoutRequestSchema>;
export type PatchWorkoutRequest = Static<typeof PatchWorkoutRequestSchema>;

export const PatchWorkoutItemRequestSchema = Type.Object(
  {
    expectedWorkoutVersion: Type.Integer({ minimum: 1 }),
    exerciseId: Type.Optional(UuidSchema),
    sets: Type.Optional(Type.Integer({ minimum: 1, maximum: 5 })),
    reps: Type.Optional(Type.Union([Type.Integer({ minimum: 1, maximum: 50 }), Type.Null()])), // null clears reps when switching to a hold
    holdSeconds: Type.Optional(
      Type.Union([Type.Integer({ minimum: 1, maximum: 600 }), Type.Null()]),
    ),
    restSeconds: Type.Optional(Type.Integer({ minimum: 0, maximum: 300 })),
    cautionAcknowledgements: Type.Optional(Type.Array(NonEmptyStringSchema, { maxItems: 50 })),
  },
  { additionalProperties: false },
);
export type PatchWorkoutItemRequest = Static<typeof PatchWorkoutItemRequestSchema>;

export const ExerciseAlternativeSchema = Type.Object({
  exercise: ExerciseSummarySchema,
  compatibility: CompatibilityResultSchema,
  rankScore: Type.Integer({ minimum: 0, maximum: 100 }),
});

export const ExerciseAlternativesResponseSchema = Type.Object({
  data: Type.Array(ExerciseAlternativeSchema, { maxItems: 10 }), // swap candidates. keep the picker small.
});

// session lifecycle labels. the state machines live in domain, not here.
export const WorkoutSessionStateSchema = Type.Union([
  Type.Literal('active'),
  Type.Literal('paused'),
  Type.Literal('resting'),
  Type.Literal('completed'),
  Type.Literal('cancelled'),
]);
export type WorkoutSessionState = Static<typeof WorkoutSessionStateSchema>;

export const ExerciseSessionStateSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('active'),
  Type.Literal('paused'),
  Type.Literal('resting'),
  Type.Literal('completed'),
  Type.Literal('cancelled'),
  Type.Literal('skipped'), // skipped is exercise-only. do not send it on a workout session.
]);
export type ExerciseSessionState = Static<typeof ExerciseSessionStateSchema>;

export const FeedbackCodeSchema = Type.Union([
  Type.Literal('low_tracking_confidence'),
  Type.Literal('tempo_too_slow'),
  Type.Literal('range_of_motion_short'),
  Type.Literal('target_position_missed'),
  Type.Literal('movement_jerky'),
  Type.Literal('stability_left'),
  Type.Literal('stability_right'),
]); // closed codes only. never a free-text form note.
export type FeedbackCode = Static<typeof FeedbackCodeSchema>;

// derived metrics only. no video, images, audio, or pose landmarks — extra keys must fail.
export const RepMetricSchema = Type.Object(
  {
    setNumber: Type.Integer({ minimum: 1, maximum: 5 }),
    repNumber: Type.Integer({ minimum: 1, maximum: 50 }),
    counted: Type.Boolean(), // false reps still upload; analysis needs the misses
    durationMs: Type.Optional(Type.Integer({ minimum: 0, maximum: 3600000 })),
    rangeOfMotionDeg: Type.Optional(Type.Number({ minimum: 0, maximum: 360 })),
    targetPositionReached: Type.Optional(Type.Boolean()),
    accuracyScore: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
    controlScore: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
    stabilityScore: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
    formScore: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
    trackingConfidence: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })), // 0-1 from on-device tracking. not a form score.
    feedbackCodes: Type.Array(FeedbackCodeSchema, { maxItems: 7, uniqueItems: true }),
    recordedOffsetMs: Type.Optional(Type.Integer({ minimum: 0, maximum: 86400000 })),
  },
  { additionalProperties: false }, // extra keys like landmarks must fail, not be stripped
);
export type RepMetric = Static<typeof RepMetricSchema>;

export const MetricBatchRequestSchema = Type.Object(
  {
    batchId: UuidSchema, // idempotency key for the upload. duplicates should not double-count.
    metrics: Type.Array(RepMetricSchema, { maxItems: 100 }),
  },
  { additionalProperties: false }, // same hard reject as rep metrics. no media blobs.
);

export type MetricBatchRequest = Static<typeof MetricBatchRequestSchema>;

export const MetricBatchResponseSchema = Type.Object({
  data: Type.Object({
    acceptedCount: Type.Integer({ minimum: 0 }),
    duplicateCount: Type.Integer({ minimum: 0 }),
    rejectedCount: Type.Integer({ minimum: 0 }), // accepted + duplicate + rejected should match what was sent
  }),
});
export type MetricBatchResponse = Static<typeof MetricBatchResponseSchema>;

// post-session analysis. nulls mean not enough clean reps, not a literal zero.
export const RomAnalysisSchema = Type.Object({
  averageDeg: Type.Union([Type.Number(), Type.Null()]),
  minimumDeg: Type.Union([Type.Number(), Type.Null()]),
  maximumDeg: Type.Union([Type.Number(), Type.Null()]),
  percentageInTarget: Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
});

export const TempoAnalysisSchema = Type.Object({
  meanSeconds: Type.Union([Type.Number({ minimum: 0 }), Type.Null()]),
  medianSeconds: Type.Union([Type.Number({ minimum: 0 }), Type.Null()]),
  standardDeviationSeconds: Type.Union([Type.Number({ minimum: 0 }), Type.Null()]),
  targetAdherence: Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
});

export const ExerciseAnalysisSchema = Type.Object({
  completion: Type.Object({
    countedReps: Type.Integer({ minimum: 0 }),
    targetReps: Type.Integer({ minimum: 0 }),
    percentage: Type.Number({ minimum: 0, maximum: 100 }),
  }),
  rangeOfMotion: RomAnalysisSchema,
  movementAccuracy: Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
  movementControl: Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
  stability: Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
  tempo: TempoAnalysisSchema,
  overallScore: Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
  performanceChange: Type.Union([
    Type.Object({
      classification: Type.Union([
        Type.Literal('stable'),
        Type.Literal('mild_decline'),
        Type.Literal('notable_decline'),
      ]), // decline-only. improvement is not a separate bucket here.
      delta: Type.Number(),
    }),
    Type.Null(),
  ]),
});

export const ExerciseAnalysisResponseSchema = Type.Object({ data: ExerciseAnalysisSchema });
export type ExerciseAnalysis = Static<typeof ExerciseAnalysisSchema>;

export const WorkoutSessionSchema = Type.Object({
  id: UuidSchema,
  workoutId: UuidSchema,
  state: WorkoutSessionStateSchema,
  startedAt: Type.String({ minLength: 1 }),
  endedAt: Type.Union([Type.String({ minLength: 1 }), Type.Null()]), // null while the session is still open
  durationSeconds: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]), // server-computed. do not send this on create.
  version: Type.Integer({ minimum: 1 }),
});
export type WorkoutSession = Static<typeof WorkoutSessionSchema>;

export const ExerciseSessionSchema = Type.Object({
  id: UuidSchema,
  workoutSessionId: UuidSchema,
  workoutItemId: Type.Union([UuidSchema, Type.Null()]), // null if the item was removed after the session started
  exerciseId: UuidSchema,
  state: ExerciseSessionStateSchema,
  targetReps: Type.Integer({ minimum: 0 }), // 0 is valid for hold-based items
  targetSets: Type.Integer({ minimum: 1, maximum: 5 }),
  completedReps: Type.Integer({ minimum: 0 }),
  completedSets: Type.Integer({ minimum: 0 }),
  startedAt: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  endedAt: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
  version: Type.Integer({ minimum: 1 }),
});
export type ExerciseSession = Static<typeof ExerciseSessionSchema>;

export const WorkoutSessionResponseSchema = Type.Object({ data: WorkoutSessionSchema });
export const WorkoutSessionListResponseSchema = Type.Object({
  data: Type.Array(WorkoutSessionSchema),
  page: PageSchema,
});
export const ExerciseSessionResponseSchema = Type.Object({ data: ExerciseSessionSchema });
export const ExerciseSessionListResponseSchema = Type.Object({
  data: Type.Array(ExerciseSessionSchema),
});

export const CreateWorkoutSessionRequestSchema = Type.Object({
  clientRequestId: UuidSchema, // idempotency. two creates with the same id should return the same session.
  workoutId: UuidSchema,
});
export type CreateWorkoutSessionRequest = Static<typeof CreateWorkoutSessionRequestSchema>;

export const PatchWorkoutSessionRequestSchema = Type.Object({
  expectedVersion: Type.Integer({ minimum: 1 }), // optimistic lock; mismatch should 409
  state: Type.Optional(WorkoutSessionStateSchema),
  endReason: Type.Optional(Type.String({ maxLength: 80 })), // closed-ish; keep it short, never a diary
});
export type PatchWorkoutSessionRequest = Static<typeof PatchWorkoutSessionRequestSchema>;

export const PatchExerciseSessionRequestSchema = Type.Object({
  expectedVersion: Type.Integer({ minimum: 1 }),
  state: Type.Optional(ExerciseSessionStateSchema), // state-only. reps come from metric batches, not this body.
});
export type PatchExerciseSessionRequest = Static<typeof PatchExerciseSessionRequestSchema>;

export const CompleteSessionRequestSchema = Type.Object({
  expectedVersion: Type.Integer({ minimum: 1 }),
  endReason: Type.Optional(Type.String({ maxLength: 80 })),
}); // complete is its own route so a generic patch cannot sneak extra fields through.
export type CompleteSessionRequest = Static<typeof CompleteSessionRequestSchema>;

// aggregates rebuilt from sessions. not a place for user-authored notes.
export const ProgressSummarySchema = Type.Object({
  totalActiveSeconds: Type.Integer({ minimum: 0 }),
  totalExercises: Type.Integer({ minimum: 0 }),
  totalSets: Type.Integer({ minimum: 0 }),
  totalReps: Type.Integer({ minimum: 0 }),
  averageScore: Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]), // null until there is at least one scored session
  bodyCoverage: Type.Array(
    Type.Object({
      bodyRegionId: NonEmptyStringSchema,
      intensity: Type.Number({ minimum: 0, maximum: 100 }),
    }),
  ), // derived from sessions. not a place to store user notes.
});
export type ProgressSummary = Static<typeof ProgressSummarySchema>;

export const ProgressSummaryResponseSchema = Type.Object({ data: ProgressSummarySchema });
export const ProgressActivityResponseSchema = Type.Object({
  data: Type.Array(
    Type.Object({
      activityDate: Type.String({ minLength: 1 }), // calendar date in the user's timezone, not a utc instant
      sessionCount: Type.Integer({ minimum: 0 }),
      exerciseCount: Type.Integer({ minimum: 0 }),
      setCount: Type.Integer({ minimum: 0 }),
      repCount: Type.Integer({ minimum: 0 }),
      activeSeconds: Type.Integer({ minimum: 0 }),
      averageScore: Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
    }),
  ),
  page: PageSchema,
});

export const ExerciseProgressResponseSchema = Type.Object({
  data: Type.Object({
    exerciseId: UuidSchema,
    currentScore: Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
    baselineScore: Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]), // earlier window, not "first ever". null if we lack history.
    scoreDelta: Type.Union([Type.Number(), Type.Null()]), // current minus baseline. null when either side is missing.
    relativePercentage: Type.Union([Type.Number(), Type.Null()]),
  }),
});
export type ExerciseProgressResponse = Static<typeof ExerciseProgressResponseSchema>;

// closed reference catalogs. ids here are the only legal keys on profiles.
export const ReferenceEntrySchema = Type.Object({
  id: NonEmptyStringSchema,
  label: NonEmptyStringSchema,
  sortOrder: Type.Integer({ minimum: 0 }),
});

export const ReferenceDataResponseSchema = Type.Object({
  data: Type.Object({
    bodyRegions: Type.Array(
      Type.Intersect([
        ReferenceEntrySchema,
        Type.Object({
          side: Type.Union([Type.Literal('central'), Type.Literal('left'), Type.Literal('right')]),
          parentId: Type.Optional(NonEmptyStringSchema), // nested regions; missing parent means top-level
        }),
      ]),
    ),
    capabilities: Type.Array(ReferenceEntrySchema),
    equipment: Type.Array(
      Type.Intersect([ReferenceEntrySchema, Type.Object({ category: NonEmptyStringSchema })]),
    ),
    goals: Type.Array(ReferenceEntrySchema),
    muscleGroups: Type.Array(ReferenceEntrySchema),
  }),
});
