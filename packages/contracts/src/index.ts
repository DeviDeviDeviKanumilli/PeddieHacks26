import { type Static, Type } from '@sinclair/typebox';

const UuidSchema = Type.String({
  pattern:
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
});
const NonEmptyStringSchema = Type.String({ minLength: 1 });

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
    status: Type.Union([Type.Literal('ready'), Type.Literal('degraded')]),
  }),
});

export type ReadyResponse = Static<typeof ReadyResponseSchema>;

export const ErrorItemSchema = Type.Object({
  code: NonEmptyStringSchema,
  message: NonEmptyStringSchema,
  path: Type.Optional(Type.Array(NonEmptyStringSchema)),
});

export const ErrorResponseSchema = Type.Object({
  type: NonEmptyStringSchema,
  title: NonEmptyStringSchema,
  status: Type.Integer({ minimum: 400, maximum: 599 }),
  code: NonEmptyStringSchema,
  detail: NonEmptyStringSchema,
  requestId: NonEmptyStringSchema,
  errors: Type.Optional(Type.Array(ErrorItemSchema, { maxItems: 50 })),
});

export type ErrorResponse = Static<typeof ErrorResponseSchema>;

export const BodyRegionStateSchema = Type.Union([
  Type.Literal('neutral'),
  Type.Literal('focus'),
  Type.Literal('limited'),
  Type.Literal('avoid'),
]);

export const CapabilityStateSchema = Type.Union([
  Type.Literal('unknown'),
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
  bodyRegions: Type.Record(NonEmptyStringSchema, BodyRegionStateSchema),
  capabilities: Type.Record(NonEmptyStringSchema, CapabilityStateSchema),
  equipmentIds: Type.Array(NonEmptyStringSchema, { maxItems: 64, uniqueItems: true }),
  goalIds: Type.Array(NonEmptyStringSchema, { maxItems: 32, uniqueItems: true }),
  intensityPreference: IntensityPreferenceSchema,
});

export type MovementProfile = Static<typeof MovementProfileSchema>;

export const UpdateMovementProfileRequestSchema = Type.Object({
  expectedVersion: Type.Integer({ minimum: 1 }),
  bodyRegions: Type.Record(NonEmptyStringSchema, BodyRegionStateSchema),
  capabilities: Type.Record(NonEmptyStringSchema, CapabilityStateSchema),
  equipmentIds: Type.Array(NonEmptyStringSchema, { maxItems: 64, uniqueItems: true }),
  goalIds: Type.Array(NonEmptyStringSchema, { maxItems: 32, uniqueItems: true }),
  intensityPreference: IntensityPreferenceSchema,
});

export type UpdateMovementProfileRequest = Static<typeof UpdateMovementProfileRequestSchema>;

export const ExperienceLevelSchema = Type.Union([
  Type.Literal('beginner'),
  Type.Literal('intermediate'),
  Type.Literal('advanced'),
]);

export const UserProfileSchema = Type.Object({
  userId: UuidSchema,
  displayName: Type.Union([Type.String({ maxLength: 120 }), Type.Null()]),
  timezone: NonEmptyStringSchema,
  experienceLevel: ExperienceLevelSchema,
  intensityPreference: IntensityPreferenceSchema,
  onboardingCompletedAt: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
});

export const UserProfileResponseSchema = Type.Object({ data: UserProfileSchema });
export type UserProfile = Static<typeof UserProfileSchema>;

export const UserProfilePatchSchema = Type.Object({
  displayName: Type.Optional(Type.Union([Type.String({ maxLength: 120 }), Type.Null()])),
  timezone: Type.Optional(NonEmptyStringSchema),
  experienceLevel: Type.Optional(ExperienceLevelSchema),
  intensityPreference: Type.Optional(IntensityPreferenceSchema),
});

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
  poseOverlayEnabled: Type.Boolean(),
  defaultRestDurationSeconds: Type.Integer({ minimum: 0, maximum: 300 }),
});

export const SettingsResponseSchema = Type.Object({ data: SettingsSchema });
export type Settings = Static<typeof SettingsSchema>;

export const SettingsPatchSchema = Type.Partial(SettingsSchema);

export const CompatibilityStatusSchema = Type.Union([
  Type.Literal('compatible'),
  Type.Literal('caution'),
  Type.Literal('incompatible'),
]);

export const CompatibilityReasonCodeSchema = Type.Union([
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
  message: NonEmptyStringSchema,
});

export const CompatibilityResultSchema = Type.Object({
  exerciseId: UuidSchema,
  exerciseSlug: NonEmptyStringSchema,
  status: CompatibilityStatusSchema,
  score: Type.Integer({ minimum: 0, maximum: 100 }),
  engineVersion: NonEmptyStringSchema,
  reasons: Type.Array(CompatibilityReasonSchema, { maxItems: 50 }),
});

export type CompatibilityResult = Static<typeof CompatibilityResultSchema>;

export const ExercisePrescriptionSchema = Type.Object({
  sets: Type.Integer({ minimum: 1, maximum: 5 }),
  reps: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
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
  trackingSupported: Type.Boolean(),
  contentVersion: Type.Integer({ minimum: 1 }),
});

export type ExerciseSummary = Static<typeof ExerciseSummarySchema>;

export const GeneratedWorkoutItemSchema = Type.Object({
  id: UuidSchema,
  position: Type.Integer({ minimum: 1, maximum: 6 }),
  exerciseId: UuidSchema,
  exerciseSlug: NonEmptyStringSchema,
  sets: Type.Integer({ minimum: 1, maximum: 5 }),
  reps: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
  holdSeconds: Type.Optional(Type.Integer({ minimum: 1, maximum: 600 })),
  restSeconds: Type.Integer({ minimum: 0, maximum: 300 }),
  estimatedSeconds: Type.Integer({ minimum: 1 }),
  rankScore: Type.Integer({ minimum: 0, maximum: 100 }),
  compatibility: CompatibilityResultSchema,
});

export const GenerateWorkoutRequestSchema = Type.Object({
  clientRequestId: UuidSchema,
  durationMinutes: Type.Integer({ minimum: 5, maximum: 45 }),
  primaryRegionIds: Type.Optional(
    Type.Array(NonEmptyStringSchema, { maxItems: 12, uniqueItems: true }),
  ),
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
    source: Type.Literal('generated'),
    status: Type.Union([Type.Literal('draft'), Type.Literal('active')]),
    version: Type.Integer({ minimum: 1 }),
    createdAt: Type.String({ minLength: 1 }),
    updatedAt: Type.String({ minLength: 1 }),
    engineVersion: NonEmptyStringSchema,
    requestedDurationMinutes: Type.Integer({ minimum: 5, maximum: 45 }),
    totalEstimatedSeconds: Type.Integer({ minimum: 1 }),
    items: Type.Array(GeneratedWorkoutItemSchema, { minItems: 3, maxItems: 6 }),
  }),
});

export type GenerateWorkoutResponse = Static<typeof GenerateWorkoutResponseSchema>;

export const PageSchema = Type.Object({
  nextCursor: Type.Union([Type.String(), Type.Null()]),
  hasMore: Type.Boolean(),
});

export const WorkoutStatusSchema = Type.Union([
  Type.Literal('draft'),
  Type.Literal('active'),
  Type.Literal('completed'),
  Type.Literal('archived'),
]);

export const WorkoutSourceSchema = Type.Union([Type.Literal('generated'), Type.Literal('manual')]);

export const WorkoutItemSchema = Type.Object({
  id: UuidSchema,
  position: Type.Integer({ minimum: 1, maximum: 50 }),
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
  requestedDurationMinutes: Type.Union([Type.Integer({ minimum: 5, maximum: 45 }), Type.Null()]),
  engineVersion: Type.Union([NonEmptyStringSchema, Type.Null()]),
  profileVersion: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
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
  clientRequestId: UuidSchema,
  title: Type.String({ minLength: 1, maxLength: 120 }),
  items: Type.Array(
    Type.Object({
      exerciseId: UuidSchema,
      sets: Type.Integer({ minimum: 1, maximum: 5 }),
      reps: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
      holdSeconds: Type.Optional(Type.Integer({ minimum: 1, maximum: 600 })),
      restSeconds: Type.Integer({ minimum: 0, maximum: 300 }),
      cautionAcknowledgements: Type.Optional(Type.Array(NonEmptyStringSchema, { maxItems: 50 })),
    }),
    { minItems: 1, maxItems: 50 },
  ),
});

export const PatchWorkoutRequestSchema = Type.Object({
  expectedVersion: Type.Integer({ minimum: 1 }),
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  status: Type.Optional(Type.Union([Type.Literal('draft'), Type.Literal('active')])),
});

export type Workout = Static<typeof WorkoutSchema>;
export type WorkoutItem = Static<typeof WorkoutItemSchema>;
export type CreateManualWorkoutRequest = Static<typeof CreateManualWorkoutRequestSchema>;
export type PatchWorkoutRequest = Static<typeof PatchWorkoutRequestSchema>;

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
          parentId: Type.Optional(NonEmptyStringSchema),
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
